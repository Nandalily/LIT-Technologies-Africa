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

	const flipbooks = document.querySelectorAll("[data-flipbook]");
	flipbooks.forEach((flipbook) => {
		const sources = [...flipbook.querySelectorAll("[data-page-index]")];
		const leftPage = flipbook.querySelector("[data-flip-left]");
		const rightPage = flipbook.querySelector("[data-flip-right]");
		const previous = flipbook.querySelector("[data-flip-prev]");
		const next = flipbook.querySelector("[data-flip-next]");
		const status = flipbook.querySelector("[data-flip-status]");
		const rail = flipbook.querySelector("[data-flip-rail]");
		if (!sources.length || !leftPage || !rightPage) return;

		let pageIndex = 0;
		let audioContext;
		const playPageTurnSound = () => {
			const AudioContext = window.AudioContext || window.webkitAudioContext;
			if (!AudioContext) return;
			audioContext = audioContext || new AudioContext();
			const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.1, audioContext.sampleRate);
			const data = buffer.getChannelData(0);
			for (let index = 0; index < data.length; index += 1) data[index] = (Math.random() * 2 - 1) * Math.exp(-index / 650);
			const source = audioContext.createBufferSource();
			const gain = audioContext.createGain();
			source.buffer = buffer;
			gain.gain.value = 0.035;
			source.connect(gain);
			gain.connect(audioContext.destination);
			source.start();
		};
		const renderPage = (target, source) => {
			target.replaceChildren();
			if (source) target.appendChild(source.cloneNode(true));
			else target.classList.add("is-empty");
			if (source) target.classList.remove("is-empty");
		};
		const showPages = (index, direction) => {
			pageIndex = Math.max(0, Math.min(index, Math.max(0, sources.length - 2)));
			flipbook.classList.remove("is-turning-left", "is-turning-right");
			if (direction) {
				void flipbook.offsetWidth;
				flipbook.classList.add(direction === "next" ? "is-turning-right" : "is-turning-left");
				playPageTurnSound();
			}
			renderPage(leftPage, sources[pageIndex]);
			renderPage(rightPage, sources[pageIndex + 1]);
			const first = String(pageIndex + 1).padStart(2, "0");
			const last = String(Math.min(pageIndex + 2, sources.length)).padStart(2, "0");
			status.textContent = sources.length === 1 ? "Page 01" : `Pages ${first}–${last}`;
			previous.disabled = pageIndex === 0;
			next.disabled = pageIndex >= sources.length - 2;
			if (rail) rail.querySelectorAll("button").forEach((button, thumbnailIndex) => button.classList.toggle("is-active", thumbnailIndex === pageIndex || thumbnailIndex === pageIndex + 1));
		};
		previous.addEventListener("click", () => showPages(pageIndex - 2, "previous"));
		next.addEventListener("click", () => showPages(pageIndex + 2, "next"));
		flipbook.addEventListener("keydown", (event) => {
			if (event.key === "ArrowLeft") showPages(pageIndex - 2, "previous");
			if (event.key === "ArrowRight") showPages(pageIndex + 2, "next");
		});
		let touchStartX = 0;
		flipbook.addEventListener("touchstart", (event) => { touchStartX = event.changedTouches[0].screenX; }, { passive: true });
		flipbook.addEventListener("touchend", (event) => {
			const distance = event.changedTouches[0].screenX - touchStartX;
			if (Math.abs(distance) < 40) return;
			showPages(pageIndex + (distance < 0 ? 2 : -2), distance < 0 ? "next" : "previous");
		}, { passive: true });
		flipbook.tabIndex = 0;
		if (rail) {
			sources.forEach((source, sourceIndex) => {
				const thumbnail = document.createElement("button");
				thumbnail.type = "button";
				thumbnail.className = "flipbook-thumbnail";
				thumbnail.setAttribute("aria-label", `Open page ${sourceIndex + 1}`);
				const image = source.querySelector("img");
				if (image) {
					const preview = image.cloneNode();
					preview.alt = "";
					thumbnail.appendChild(preview);
				} else {
					thumbnail.innerHTML = `<i class="bi bi-file-earmark-text"></i>`;
				}
				thumbnail.addEventListener("click", () => showPages(sourceIndex % 2 ? sourceIndex - 1 : sourceIndex, sourceIndex > pageIndex ? "next" : "previous"));
				rail.appendChild(thumbnail);
			});
		}
		showPages(0);
	});

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
