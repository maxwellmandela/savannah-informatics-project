## Tech Stack

Outlines the technical approach for the project

### Framework

React with Vite and TypeScript.

React Router will provide client-side routes and browser history.

### State and Data Fetching

TanStack Query (React Query) selected for:

- It isolates server state from local UI state without requiring a Redux store.
- Query keys can include the complete URL filter state, for example `['products', { q, category, sortBy, order, page }]`.
- Changing a query key fetches the correct result and gives each filter combination its own cache entry.
- Requests will use TanStack Query's `AbortSignal`, so obsolete slow searches can be cancelled.
- Failed requests expose retry state for the error UI rather than leaving a blank screen.

### UI Library

Tailwind CSS + Shadcn UI

Tailwind will provide design tokens and responsive layout utilities. Shadcn UI components will be configured in the project source so their keyboard and focus behaviour can be adapted to the tablet workflow.

### Core Architecture

Browser client <> DummyJSON API

React Router controls navigation. TanStack Query manages API data. An Auth Context manages the current session. There is no application server in this version.

### Routes and Screen Components

Components:

- `LoginPage` for signing in.
- `AppLayout` for the authenticated shell and navigation.
- `StockListPage` for the paginated catalogue.
- `StockFilters` for search, category and sort controls.
- `StockTable` or `StockGrid` for the current page of products.
- `PaginationControls` for page navigation.
- `ItemDetailPage` for `/items/:id` and stock correction.
- `LoadingState`, `EmptyState` and `ErrorState` for every API-backed screen.

Routes:

- `/login`
- `/items?q=&category=&sortBy=&order=&page=`
- `/items/:id`

The product ID is a route parameter because an item detail URL must be easy to share. Search, filter, sort and pagination values are query parameters because they describe the current list view.

State management:

- Server state: TanStack Query owns product lists, categories, individual products, loading, error and mutation status.
- URL state: React Router's `useSearchParams` owns `q`, `category`, `sortBy`, `order` and `page`. The URL is the source of truth so reloads, browser navigation and copied links restore the same list view.
- Local UI state: React `useState` owns the debounced search input, the temporary stock-count form value and transient UI state such as a confirmation message.
- Session state: `AuthContext` owns the current user and token pair. It is not mixed into product query state.

When a category, sort order or search query changes, the page is reset to `1`. This avoids requesting a page that no longer exists for the new result set.

### Data Fetching, Caching and Invalidation

- Cache product lists using `['products', { q, category, sortBy, order, page }]`.
- Cache categories separately because they change less frequently.
- Cache individual products using `['product', id]`.
- Debounce search input before updating the URL and pass the request `AbortSignal` to `fetch`.
- Do not display previous results as the result for a newly committed search while the new request is pending.
- On a successful stock correction, update the individual product cache and invalidate matching product-list queries.
- During a correction, disable the save action and show a saving state. On failure, keep the previous value and show a retryable error.

### Design System and Styling

Tailwind design tokens will define spacing, typography, colour and focus styles. The layout will use a restrained, high-contrast palette: a dark ink colour for text, cool neutrals for surfaces and borders, teal for primary actions, amber for low stock and red for errors. Spacing and controls will be sized for ward tablets, with a minimum target size of 44 by 44 pixels.

Shadcn UI is selected for accessible primitives that live in the repository and can be configured rather than treated as an opaque theme.

### Accessibility

- Use semantic headings, landmarks, labels and buttons.
- Keep all controls reachable and operable with the keyboard.
- Provide visible, high-contrast focus styles.
- Use `aria-busy` for loading regions and an appropriate live region for result-count changes and save status.
- Ensure error and empty states are understandable without colour alone.
- Keep the layout readable at 360px and avoid relying on hover interactions.

### Authentication

The login request sends `expiresInMins: 1` so expiry can be tested during development.

1. Submit credentials to `POST /auth/login`.
2. Store the returned access and refresh tokens in `localStorage` so the session can survive a browser reload.
3. Keep the current user in `AuthContext` and verify it with `GET /auth/me` when the app starts.
4. Add the access token as a Bearer token to API requests.
5. If an authenticated request returns `401`, call `POST /auth/refresh`, replace both stored tokens and retry the original request once.
6. If refresh fails, clear the session and redirect to `/login` while preserving the original pathname and query string as the return location.
7. After a successful login, navigate back to that return location instead of always sending the user to the first page.

This is a browser-only assessment, so `localStorage` is the practical choice for persistence. In a production application I would prefer secure HTTP-only cookies managed by a backend, because JavaScript-readable tokens are exposed to XSS.

### Error and Network Resiliency

Every data-backed screen has loading, empty and error states. Error states include a retry action. I will test slow requests using `?delay=2000` and HTTP failures using `/http/500`.

The search flow is designed so a response for an older query cannot replace the result for a newer query: the query key changes with the URL, obsolete requests are aborted and only the active query result is rendered.

### Known API Limitation

DummyJSON simulates product updates but does not persist them on the server. After a successful `PUT /products/{id}`, the application will update its local TanStack Query caches so the correction is visible during the current session. A full reload may show the original server value again. This limitation will be documented in the README and treated as a property of the mock API, not as confirmed persistence.

### Decision Log

1. **Vite + React SPA over Next.js (App Router)**
   - **Rejected Alternative:** Next.js (App Router).
   - **Reasoning:** The console is entirely behind an auth guard with no SEO requirements. Vite provides a minimal, fast build step with no unnecessary server runtime or SSR hydration overhead for client-side state.

2. **URL Search Params as the Source of Truth for List Filters**
   - **Rejected Alternative:** Storing search, filter, and pagination in local React `useState`.
   - **Reasoning:** Ward staff share links to specific views over chat. Syncing state directly to URL parameters enables deep-linking, bookmarking, and reliable browser history reloads without state loss.

3. **Client-Side Cache Patching for Simulated Product Updates**
   - **Rejected Alternative:** Relying solely on server re-fetches after a `PUT /products/{id}` request.
   - **Reasoning:** DummyJSON does not persist mutations on its server. To provide a correct user experience during testing, we manually update the local TanStack Query cache (`['product', id]` and `['products', ...]`) upon a successful `200 OK` response.
