# LensFlow Security Specification

## Data Invariants
1. A Booking must belong to a Client.
2. A Payment must be linked to a valid Booking.
3. Only the owner (photographer) can see their data. (Note: Since this is a single-user app for now, we'll restrict to the authenticated user).
4. All timestamps must be server-generated.

## The Dirty Dozen (Attack Vectors)
1. **The Ghost Field**: Adding `isAdmin: true` to a client profile.
2. **The ID Poisoning**: Using a 1MB string as a document ID.
3. **The Identity Spoof**: Trying to read another user's client list.
4. **The Price Manipulation**: Setting a booking price to negative.
5. **The Orphaned Payment**: Creating a payment for a non-existent booking.
6. **The Immutable Warp**: Changing `createdAt` on an existing booking.
7. **The Blanket Read**: Querying all bookings without a user filter.
8. **The Status Jump**: Moving a project from 'Booked' directly to 'Delivered' without 'Shot'. (Wait, photographer requested reverse is possible, so we'll allow flexible status updates but validate keys).
9. **The Denial of Wallet**: Sending massive remarks fields to bloat storage costs.
10. **The Unverified Entry**: Creating data without a verified email (if strict).
11. **The System Breach**: Modifying fields that should be server-only.
12. **The Cross-Service Leak**: Using a client ID from another context.
