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

	const albumCreator = document.querySelector("[data-album-create-form]");
	if (albumCreator) {
		const imageInput = albumCreator.querySelector('input[type="file"]');
		const thumbnails = albumCreator.querySelector("[data-builder-thumbs]");
		const status = albumCreator.querySelector("[data-builder-status]");
		const maximumImages = Number(albumCreator.dataset.maxImages || 5);
		imageInput.addEventListener("change", () => {
			const selected = [...imageInput.files];
			if (selected.length > maximumImages) {
				status.textContent = `Your current plan allows ${maximumImages} images.`;
				imageInput.value = "";
				thumbnails.replaceChildren();
				return;
			}
			status.textContent = `${selected.length} image${selected.length === 1 ? "" : "s"} selected.`;
			thumbnails.replaceChildren(...selected.map((file) => {
				const image = document.createElement("img");
				image.alt = "";
				image.src = URL.createObjectURL(file);
				return image;
			}));
		});
		albumCreator.addEventListener("submit", async (event) => {
			event.preventDefault();
			const submit = albumCreator.querySelector('button[type="submit"]');
			if (!imageInput.files.length) return;
			submit.disabled = true;
			status.textContent = "Creating your album...";
			try {
				const response = await fetch("/albums/create", { method: "POST", body: new FormData(albumCreator) });
				const result = await response.json();
				if (!response.ok) throw new Error(result.message || "Unable to create album.");
				window.location.assign(result.albumUrl);
			} catch (error) {
				submit.disabled = false;
				status.textContent = error.message;
			}
		});
	}

	document.querySelectorAll("[data-subscribe]").forEach((button) => {
		button.addEventListener("click", async () => {
			button.disabled = true;
			const originalLabel = button.innerHTML;
			button.innerHTML = "Opening checkout...";
			try {
				const response = await fetch("/subscribe/checkout", { method: "POST", headers: { "Content-Type": "application/json" } });
				const result = await response.json();
				if (!response.ok || !result.url) throw new Error(result.error || "Checkout is unavailable.");
				window.location.assign(result.url);
			} catch (error) {
				button.disabled = false;
				button.innerHTML = originalLabel;
				window.alert(error.message);
			}
		});
	});
});
