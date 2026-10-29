# AC-008: Show the customer name in the operator email

## AC-008-08 — Billing-enabled operator email shows the name
Given an operator email input with `clientName` "Ana López"
And `clientEmail` "ana@example.com"
And `date`, `startTime`, `hours` and `amountCents` set
When the operator email body is built (billing-enabled variant)
Then the body contains a "Nombre" line whose value is "Ana López"
And the "Nombre" line appears immediately above the existing "Cliente" line

## AC-008-09 — Billing-disabled operator email shows the name
Given an operator email input with `clientName` "Ana López"
And `clientEmail` "ana@example.com"
And `date`, `startTime` and `hours` set
When the operator email body is built (billing-disabled variant)
Then the body contains a "Nombre" row whose value is "Ana López"
And the "Nombre" row appears above the existing "Cliente" row

## AC-008-10 — Name is HTML-escaped in the email body
Given an operator email input with `clientName` "<script>alert(1)</script>"
When the operator email HTML part is built
Then the raw substring `<script>` does not appear in the HTML
And the HTML contains the escaped form `&lt;script&gt;`

## AC-008-11 — Absent name leaves the email unchanged
Given an operator email input with no `clientName` field
And `clientEmail`, `date`, `startTime`, `hours` and `amountCents` set
When the operator email body is built
Then no "Nombre" line appears in the body
And the body is byte-identical to the pre-name output for the same input
