# Security Policy

Kitevo handles creator accounts, OAuth tokens for Instagram and YouTube, payment
provider credentials that creators connect (Razorpay, Stripe, PayPal) and buyer
details. We take reports seriously and appreciate responsible disclosure.

## Supported versions

Kitevo is developed as a continuously deployed web application. Only the latest
commit on the `main` branch is supported with security fixes. There are no
long-term support branches or tagged releases yet.

| Version            | Supported |
| ------------------ | --------- |
| `main` (latest)    | Yes       |
| Older commits/forks | No        |

If you self-host Kitevo, keep your deployment up to date with `main`.

## Reporting a vulnerability

**Please do not open a public issue, discussion or pull request for security problems.**

Report vulnerabilities privately through GitHub's private vulnerability reporting:

1. Go to the [Security tab](https://github.com/S07K/kitevo/security) of this repository.
2. Click **Report a vulnerability** (or open
   [this link](https://github.com/S07K/kitevo/security/advisories/new) directly).
3. Describe the issue, affected routes or files, reproduction steps and the impact
   you believe it has. A minimal proof of concept helps a lot.

What to expect:

- An acknowledgement of your report, normally within a few days.
- An assessment and, if confirmed, a fix developed in a private security advisory.
- Credit in the published advisory if you would like it.

## Scope and guidelines

In scope: this repository's code, including authentication, authorization between
creator and brand accounts, payment and webhook verification, token encryption,
custom-domain routing and the public kit, product and deal pages.

Please:

- Test only against your own local or self-hosted instance. Do not run automated
  scanners, load tests or social engineering against getkitevo.com or its users.
- Never access, modify or delete data that is not yours.
- Never include real secrets, tokens or personal data in your report beyond what is
  needed to demonstrate the issue.

Out of scope: vulnerabilities in third-party services (Meta, Google, Stripe,
Razorpay, PayPal, Dodo Payments, Supabase, Vercel, Resend) should be reported to
those vendors directly.

## Handling secrets

- Never commit `.env` files or credentials. `.env.example` contains placeholders only.
- If you believe a secret has been committed to this repository, report it privately
  as above so it can be rotated.
