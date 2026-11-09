/**
 * Svelte action that watches elements with `data-step-id` inside `container`
 * and calls `onStepChange(stepId)` when the "active" step changes.
 *
 * Algorithm: the active step is the one whose CENTRE is closest to an imaginary
 * line in the viewport (target). This keeps short cards from being skipped
 * during fast scrolling, unlike the "last intersecting wins" approach, which
 * is fragile when two cards enter the band at the same time.
 *
 * Responsive: on desktop the target line sits at ~40% of the viewport (above
 * the centre). On mobile (≤900px) the graph is sticky at the top (~40dvh), so
 * the useful reading area is the lower half and the target moves to ~72%.
 */
export function scrollTrigger(
	container: HTMLElement,
	onStepChange: (stepId: string) => void
) {
	const intersecting = new Map<HTMLElement, IntersectionObserverEntry>();
	let lastFired: string | null = null;
	let observer: IntersectionObserver | null = null;

	const mql = window.matchMedia('(max-width: 900px)');

	function targetFraction(): number {
		return mql.matches ? 0.72 : 0.4;
	}

	function rootMargin(): string {
		// A generous band of ~50% of the viewport centred on the target: not an
		// exclusive activation zone, but a way to keep several candidates eligible
		// so the "closest to the target" algorithm picks among them.
		const f = targetFraction();
		const top = Math.max(0, f - 0.25) * 100;
		const bottom = (1 - Math.min(1, f + 0.25)) * 100;
		return `-${top}% 0px -${bottom}% 0px`;
	}

	function pickClosest() {
		const targetY = window.innerHeight * targetFraction();
		let best: HTMLElement | null = null;
		let bestDist = Infinity;
		for (const [el, entry] of intersecting) {
			const rect = entry.boundingClientRect;
			const center = rect.top + rect.height / 2;
			const dist = Math.abs(center - targetY);
			if (dist < bestDist) {
				bestDist = dist;
				best = el;
			}
		}
		if (best) {
			const id = best.dataset.stepId;
			if (id && id !== lastFired) {
				lastFired = id;
				onStepChange(id);
			}
		}
	}

	function buildObserver() {
		observer?.disconnect();
		intersecting.clear();

		observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					const el = entry.target as HTMLElement;
					if (entry.isIntersecting) {
						intersecting.set(el, entry);
					} else {
						intersecting.delete(el);
					}
				}
				pickClosest();
			},
			{
				root: null,
				rootMargin: rootMargin(),
				threshold: [0, 0.25, 0.5, 0.75, 1]
			}
		);

		const steps = container.querySelectorAll<HTMLElement>('[data-step-id]');
		steps.forEach((el) => observer!.observe(el));
	}

	buildObserver();
	mql.addEventListener('change', buildObserver);

	// Watch for [data-step-id] elements added after initial render
	// (e.g. from derived arrays that resolve after the action mounts).
	const mutObs = new MutationObserver(() => {
		if (!observer) return;
		const steps = container.querySelectorAll<HTMLElement>('[data-step-id]');
		steps.forEach((el) => observer!.observe(el));
	});
	mutObs.observe(container, { childList: true, subtree: true });

	return {
		destroy() {
			observer?.disconnect();
			mutObs.disconnect();
			mql.removeEventListener('change', buildObserver);
		}
	};
}
