# Accounts

`/admin/accounts` lists who can sign in and edit this map. Accounts have no public sign-up: an account exists because someone created it here.

![The list of accounts](/screens/accounts-2.png)

## Two kinds of access

| Access | Who | What it can do |
|---|---|---|
| **Superuser** | the person who installs. Comes from `PB_SUPERUSER_EMAIL` and `PB_SUPERUSER_PASSWORD` in [`.env`](./install.md#the-env-file), and has no line in this list | everything, including `/setup`, its [reset](./install.md#start-over) and the PocketBase admin. It creates the first accounts |
| **Admin** | the role of an account created here | edits all the content and the [settings](./configure.md), and looks after the other accounts |

## Create an account

**New account** asks for an **Email** and a **Password** of at least 8 characters. Give that password to the person, who signs in at [Sign in](./sign-in.md).

![The form for a new account](/screens/accounts-1.png)

## Change a password, remove an account

**change password**, in a row, sets a new password for that account. **remove** ends its access, after a confirmation. Your own row is marked **you**, and an account never removes itself.
