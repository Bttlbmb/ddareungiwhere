# Superseded: map and walking-access proposal

**Superseded by the user on 2026-09-30: bike information only. Do not carry out the account setup or walking audit below. Walking directions, walking times, and walking-budget filters are removed from scope. Map rendering will be considered separately. This file is retained only as historical research.**

Researched 2026-09-30. Recommendation for review, not an activated service. No account, key, paid service, or application code has been created.

## Proposed provider

Try **Kakao Map** for both the browser map and pedestrian routes. Its current [REST documentation](https://developers.kakao.com/docs/en/kakaomap/rest-api) includes a walking endpoint, so older advice that Kakao has no public walking API should not guide this project. Requests use origin/destination coordinates and a REST API key. The response distinguishes a successful route from missing-road and no-route results.

The [web map guide](https://apis.map.kakao.com/web/guide/) explicitly supports registered localhost URLs. The browser map uses a JavaScript key restricted to the application's domain; walking requests should use the separate REST key in the future local service. The Seoul bike key remains separate.

The [quota page](https://developers.kakao.com/docs/en/getting-started/quota) currently lists 1,000 walking requests per day. The [access policy](https://developers.kakao.com/docs/en/kakaomap/common) limits free map quota to the first app activating Kakao Map on a developer account. Confirm the free-quota badge in the account before relying on it. Additional apps or usage beyond that quota require paid-API setup. Keep paid usage disabled for this project unless separately requested.

TMAP is a backup: its [official API overview](https://www.tmapmobility.com/service/corporate/api) includes maps and pedestrian routes. It has not been tested or selected. The current task has not verified provider-specific caching, attribution, or route-data redistribution terms; those remain checks before implementation.

## Access steps if this proposal is accepted

1. Sign in to [Kakao Developers](https://developers.kakao.com/), register a developer account if needed, and create or select an appropriate app.
2. Turn on Kakao Map under its usage settings and verify that the app receives free quota. Do not enable paid APIs or attach billing for this test.
3. Obtain a REST API key for the local service and a JavaScript key for the map. Do not paste the REST key into chat. When ready, save it in the existing ignored local configuration as `KAKAO_REST_API_KEY`; save the map key as `KAKAO_JAVASCRIPT_KEY`.
4. Register the exact localhost origin under the JavaScript key's SDK domains once the development port is chosen. The official guide uses `http://localhost:8080` as an example; that port is not a project decision yet.
5. Run a small route-access audit before building the app. Authentication success and a rendered map alone do not validate station walking access.

## Walking-access audit

First confirm the actual start and destination pins. The existing data analysis uses reference bike stations, not exact journey origins. Konkuk Exit 5 versus the campus main gate remains an open choice until the user answers. The proposed Seoul origin is the east-side station entrance; City Hall/Seoul Plaza and the park entrance near Jayang Station remain provisional destinations.

For each origin, route to every departure candidate needed to cover the walking shortlist. Evaluate candidate return-station walks in the direction **station → destination**, then keep the selected return station fixed for departure comparisons. Do not assume the five stations selected by the historical audit exhaust the stations reachable within ten minutes.

For each route record the exact endpoints, request time, route option, provider distance and duration with verified units, and route geometry where permitted. Inspect crossings, entrance placement, stairs, railway barriers, and park access on the map. Compare at least one pair across a major road and one near a station entrance. All candidates must use the same routing option; the Kakao endpoint's default favors broad roads, and shortest-route mode is a separate option to evaluate.

Use a successful walking-duration result to enforce the confirmed ten-minute budget. A failed route is unknown/unavailable, never zero distance or a straight-line walk. Approximate coordinate screening can reduce requests but must not silently exclude plausible candidates or become a claimed walking time. If quota or coverage limits prevent a complete search, disclose that limitation instead of claiming the globally closest station.

The suggested shortlist margin remains two additional walking minutes beyond the nearest feasible departure, with three to five initially visible options; these numerical defaults are not confirmed. Preserve the user's ability to compare stations at almost identical walking distances.

## Completion criteria

- Account eligibility and key access verified without paid usage.
- Exact test pins agreed and routes inspected for both journeys.
- Walking time and distance units checked against the returned route and official documentation.
- Ten-minute filtering, failure handling, attribution, and provider storage/caching rules specified.
- Evidence retained with source date; no claim that walking access is already validated.
