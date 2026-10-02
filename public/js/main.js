document.addEventListener("DOMContentLoaded", () => {
	document.querySelectorAll('a[href^="#"]').forEach((link) => {
		link.addEventListener("click", (event) => {
			const target = document.querySelector(link.getAttribute("href"));
			if (!target) return;
			event.preventDefault();
			target.scrollIntoView({ behavior: "smooth", block: "start" });
		});
	});

	const revealItems = document.querySelectorAll("[data-reveal]");
	if (!("IntersectionObserver" in window)) revealItems.forEach((item) => item.classList.add("is-visible"));
	else {
		const revealObserver = new IntersectionObserver((entries, observer) => entries.forEach((entry) => {
			if (!entry.isIntersecting) return;
			entry.target.classList.add("is-visible");
			observer.unobserve(entry.target);
		}), { threshold: 0.14 });
		revealItems.forEach((item) => revealObserver.observe(item));
	}

	const announcementRoot = document.querySelector("[data-announcements]");
	if (announcementRoot) {
		const slides = [...announcementRoot.querySelectorAll("[data-announcement-slide]")];
		const dots = [...announcementRoot.querySelectorAll("[data-announcement-dot]")];
		let current = 0;
		const show = (index) => {
			current = (index + slides.length) % slides.length;
			slides.forEach((slide, slideIndex) => slide.classList.toggle("is-active", slideIndex === current));
			dots.forEach((dot, dotIndex) => dot.classList.toggle("is-active", dotIndex === current));
		};
		if (slides.length > 1) {
			announcementRoot.querySelector("[data-announcement-prev]").addEventListener("click", () => show(current - 1));
			announcementRoot.querySelector("[data-announcement-next]").addEventListener("click", () => show(current + 1));
			dots.forEach((dot) => dot.addEventListener("click", () => show(Number(dot.dataset.announcementDot))));
			setInterval(() => show(current + 1), 3200);
		}
	}

	const heroSlideshow = document.querySelector("[data-hero-slideshow]");
	if (heroSlideshow) {
		const heroSlides = [...heroSlideshow.querySelectorAll("[data-hero-slide]")];
		let heroIndex = 0;
		if (heroSlides.length > 1) {
			setInterval(() => {
				heroSlides[heroIndex].classList.remove("is-active");
				heroIndex = (heroIndex + 1) % heroSlides.length;
				heroSlides[heroIndex].classList.add("is-active");
			}, 4500);
		}
	}
});
