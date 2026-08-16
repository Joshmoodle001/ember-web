# EmberWeb Practice Front Door

## Product decision

Build a branded, install-free patient booking PWA for independent South African medical practices. It sits in front of the practice's existing clinical and billing systems rather than replacing them.

**Positioning:** Patients book, change, check in and know when to arrive from any phone; the practice keeps its current clinical and billing software.

## First customer

- One-location private GP or similarly operationally busy practice
- Two to five clinicians and an active receptionist team
- Existing diary, billing or clinical software they do not want to replace
- High phone or WhatsApp appointment volume, cancellations and delay questions

Exclude hospitals, large groups, clinical-record migrations and complex specialist procedures from the first pilot.

## Pilot offer

**Name:** EmberWeb Patient Front Door pilot

**Promise:** Launch your own booking and patient-flow link from your website, Google Business Profile, QR code and WhatsApp without asking patients to install an app.

**Pilot terms to validate before offering:**

- Three selected practices
- Four-week live pilot after setup
- One location and up to five practitioners
- Weekly receptionist feedback session
- Existing appointment diary remains in place unless EmberWeb is made authoritative for pilot appointments

The pilot must never rely on staff manually copying online bookings into a second calendar.

## MVP workflow

```text
Practice link
  -> choose service / first available / practitioner
  -> choose slot
  -> enter first name, surname and mobile number
  -> verify possession of mobile number
  -> confirmed appointment and signed manage link
  -> reminder
  -> reschedule or cancel
  -> patient checks in on arrival
  -> patient sees only their own queue status
  -> reception / clinician completes visit
```

## Patient PWA screens

1. **Practice landing** — branding, address, directions, emergency notice, book button.
2. **Book** — first available by default, named practitioner optional, short service choices.
3. **Slots** — dates, times and appointment duration where needed.
4. **Contact and verification** — name, mobile and optional email only.
5. **Confirmation** — appointment details, directions, policy, calendar event and secure manage link.
6. **Manage appointment** — reschedule/cancel using a signed expiring link, no patient password.
7. **Arrival** — “I have arrived” with a clear acknowledgement.
8. **Queue** — only the patient's own status and a conservative wait range.

## Practice workspace

- Day view filtered by practitioner
- Create booking and insert walk-in
- Reschedule, cancel, mark no-show
- Mark arrived, waiting, in consultation and complete
- Block time and set doctor running late
- Configure practice identity, practitioners, services, hours, availability, time off and cancellation window
- Staff roles: owner, receptionist, clinician

## Data boundaries

Collect only what is required to arrange and operate an appointment:

- Patient first name, surname, mobile and optional email
- Appointment time, practitioner, generic appointment type and operational status
- Delivery state for confirmations/reminders
- Audit events for staff and appointment changes

Do **not** add symptoms, free-text “reason for visit”, medical histories, ID numbers, medical-aid information, clinical notes, prescriptions, diagnoses, documents or patient-record fields.

Every practice-scoped record has a `practice_id`. Patient manage links must be signed, short-lived and scoped to a single appointment.

## Appointment truth

Before a practice can go live, select one mode:

1. **Authoritative mode:** EmberWeb is the appointment calendar for the in-scope services; the existing system remains clinical/billing only.
2. **Connected mode:** one reliable, tested calendar/PMS integration keeps appointments synchronised.

No manual reconciliation workflow is acceptable as the normal operating model.

## Communications

- Immediate confirmation
- One configurable reminder
- WhatsApp preferred where approved and technically feasible
- SMS and email fallback
- Operational messages only; do not mix reminders with marketing

## Success metrics for the pilot

| Measure | Target to test |
| --- | --- |
| Booking completion after slot selection | 70% or higher |
| Straightforward booking time | Under 90 seconds |
| System-caused double bookings | Zero |
| Eligible appointment changes made self-service | More than 50% |
| Digital appointment share after adoption | More than 30% |
| Inbound booking/status calls | 25% reduction |
| Reception appointment-admin time | 20% reduction |
| Pilots willing to pay | Two of three |

## Delivery sequence

1. Recruit and interview three pilot practices; shadow a receptionist during a busy session.
2. Choose the first authoritative diary or a single integration based on those practices' current tools.
3. Design the branded patient booking and reception day-view prototype.
4. Build booking, secure management, reminders, arrivals and queue states.
5. Add staff access, audit trails, rate limiting, backups and a practice data-processing agreement.
6. Run four live weeks, review weekly and iterate from receptionist feedback.

## Explicitly deferred

Clinical records, prescriptions, diagnosis, claims, medical-aid workflows, payments, telemedicine, AI, marketplace discovery, multi-location administration and universal PMS integrations.
