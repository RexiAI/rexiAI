# AC-008: Direct booking carries the name to the operator email

## AC-008-12 — Direct booking forwards the name to the operator email
Given a direct (billing-disabled) booking with `name` "Ana López"
And `email`, `date`, `startTime` and `hours` set
When the direct booking is finished
Then the operator email is sent with `clientName` "Ana López"
And the operator email still carries `clientEmail`, `date`, `startTime` and `hours`
