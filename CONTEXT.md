# Family Travel Planning Context

This context defines the language used by the family travel planner and keeps product terminology consistent across the agent, its tools, and its output.

## Travel planning

**Travel request**:
A family's destination, party composition, and budget preference used to create a travel plan.
_Avoid_: Query, booking request, itinerary request

**Family**:
The group traveling together, made up of one or more adults and zero or more children.
_Avoid_: Party, group, passengers (when referring to the whole traveling group)

**Travel plan**:
The structured recommendation produced for a travel request, including flight options, a hotel, activities, duration, and an estimated total cost.
_Avoid_: Booking, reservation, confirmed itinerary

**Budget preference**:
A qualitative constraint describing the family's desired spending level: budget, moderate, comfortable, or luxury.
_Avoid_: Budget amount, total budget (the current request does not contain a numeric limit)

**Estimated cost**:
An indicative euro-denominated amount calculated or presented for planning purposes; it is not a quote or a confirmed price.
_Avoid_: Final price, booking price, guaranteed cost

## Recommendations

**Flight option**:
A candidate air-travel choice with an airline, departure time, arrival time, displayed price, and number of stops.
_Avoid_: Flight booking, ticket

**Family-friendly hotel**:
An accommodation option marked as suitable for families and described by rating, nightly price, and amenities.
_Avoid_: Hotel reservation, confirmed accommodation

**Activity**:
A destination experience recommended for the family, with a category, age guidance, cost per person, duration, and description.
_Avoid_: Scheduled event (the current plan does not assign dates or times)

**Cultural experience**:
An activity centered on local heritage, history, or traditions, such as Dalt Vila or a market.

**Water activity**:
An activity taking place on or in the water, such as snorkeling or a boat trip.

## Observability

**Agent run**:
One attempt to generate a travel plan for one travel request.
_Avoid_: Booking session, conversation (the current interface is a single request)

**Model usage**:
Token consumption reported by the generative model and attached to the model span for observability analysis.
_Avoid_: Cost (token usage and estimated travel cost are different concepts)
