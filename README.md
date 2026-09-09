# Clinic Stock Console

An internal stock console for clinic supplies teams.

Staff can sign in, browse the product catalogue, search and filter stock, sort results, open a shareable item detail page, and correct a stock count when a physical count disagrees with the system.

The application is designed for ward tablets and unreliable connections. Core workflows remain clear while data is loading, when a request fails, and when a session expires.

## Planned Stack

- React with Vite and TypeScript
- React Router for navigation and shareable URLs
- TanStack Query for server-state fetching, caching and invalidation
- React Context for the authenticated session
- Tailwind CSS and Shadcn UI for responsive, accessible interface components
- DummyJSON as the catalogue and authentication API

## Supported User Journeys

- Sign in before accessing stock data (`expiresInMins: 1` test mode supported).
- Browse a paginated catalogue of 194 products.
- Search by product name, filter by category and sort the results by name or ID.
- Preserve search, filter, sort and page state in the URL so reloads and copied links restore the same list view.
- Open an item at `/items/:id` and share that URL directly.
- Correct the stock count from the item detail page with loading, success and recoverable error states.
- Refresh an expired session or redirect to `/login` while preserving the original location.

## Technical Design

The detailed Section 1 architecture and decision record is in [Tech Specification.md](docs/Tech%20Specification.md).

It covers:

- Component and route boundaries
- Server, URL, local UI and session state ownership
- Authentication and token-refresh behaviour
- Query caching, invalidation and race-safe search using `AbortSignal`
- Responsive styling and accessibility, including 44 by 44 pixel touch targets
- Loading, empty, error and retry states, including `/http/500` testing
- DummyJSON limitations and their effect on stock updates

## Local Development

Install dependencies and start the development server:

```powershell
npm install
npm run dev
```

## Deployment and CI/CD

The application is deployed on Vercel from the `master` branch.

GitHub Actions runs formatting checks, ESLint, unit tests and the production
build on every pull request. Commitlint also checks every commit in the pull
request. Failed checks block merging. Husky runs the same Conventional Commit
check locally at the `commit-msg` stage.

Vercel automatically deploys the latest commit after it is merged into `master`.

## AI Use

- **Section 1:** I used GitHub Copilot to pressure-test my initial design and compare TanStack Query with Redux. I chose TanStack Query because this project has mostly server state and does not need complex client-side state management. I made the final design and decision-log choices myself.

- **Section 2:** I used GitHub Copilot for Vite scaffolding, repetitive React and TypeScript code, authentication, token refresh, routing, stock filtering, search, pagination, product detail and stock updates. I reviewed and tested the generated code, including fixing a type-only import error and ensuring product requests also use the refresh path.

- **Section 3:** I used GitHub Copilot for guidance on the Vercel and GitHub Actions setup and for drafting the CI workflow. The workflow runs `npm ci`, formatting checks, commitlint, linting, tests and the production build. I also configured Husky to run commitlint locally.

## Section 4: AI Reflection

1. **What I used AI for:** In Section 1, I used GitHub Copilot to compare TanStack Query with Redux and challenge my ideas about URL state, authentication and caching. In Section 2, I used it for scaffolding repetitive React and TypeScript code, routing, authentication, token refresh, product search, filtering, pagination, the detail page and stock correction form. In Section 3, I used it for guidance on GitHub Actions and Vercel and for drafting the CI workflow.

2. **Tools and workflow:** I used GitHub Copilot in VS Code. I wrote the design first, implemented one feature at a time, checked the result in the browser, and used ESLint, Prettier and tests to catch problems early. I did not use a separate spec-driven development or agent workflow framework.

3. **An incomplete suggestion:** The first product requests used the access token directly, while the refresh logic was only used by the manual session check. I noticed this meant a product request could still fail after the access token expired. I fixed it by creating one authenticated request helper that refreshes after a `401` and retries the original request once. I also caught a type-only import problem when Vite reported that `AuthUser` was not a runtime export.

4. **Decisions I made without AI:** I chose React with Vite instead of Next.js because this is a client-side internal console and I wanted a simple project that I could understand. I also chose to store the access and refresh tokens in `localStorage` for this browser-only assessment because the session needs to survive a reload and there is no backend available for HTTP-only cookies. I documented the security trade-off.

5. **The part I would find hardest to defend:** The authenticated request helper and refresh flow are the parts I would currently find hardest to explain in depth. They involve retrying an original request, replacing tokens and handling failed refreshes. I have read through the code and added tests for the main paths, but I would spend more time improving my understanding and adding a concurrency test before calling this production-ready.

**Time spent:** About 9 hours overall across 2 days since receiving the assignment on 7 September at 4:00 PM.
