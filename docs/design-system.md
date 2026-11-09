# Design system

`/ds` shows the app's own components, in the deployment's real theme. Sign in and open it from the **⋮** menu of the header. Use it to check how a component looks before writing a new one.

![The design system page](/screens/design-system-1.png)

The switches at the top try each [theme](./add-a-theme.md) in light and dark, and last only in your browser. The page lists the eight colors of the entities and every component: buttons, type markers, forms, the text editor, dialogs, search and filters.

A pattern written a second time becomes a component, if it has variants or logic, or a global class in `src/lib/styles`, if it is only CSS. A new component enters `/ds`.
