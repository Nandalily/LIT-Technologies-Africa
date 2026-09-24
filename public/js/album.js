document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-album-viewer]").forEach((viewer) => {
        const files = JSON.parse(viewer.dataset.files);
        const stage = viewer.querySelector(".viewer-stage");
        const count = viewer.querySelector("[data-viewer-count]");
        const previous = viewer.querySelector("[data-viewer-prev]");
        const next = viewer.querySelector("[data-viewer-next]");
        let page = 0;
        let pdfDocument = null;
        let pdfPages = 0;

        const updateControls = () => {
            const total = pdfDocument ? pdfPages : files.length;
            count.textContent = `Page ${page + 1} of ${total}`;
            previous.disabled = page === 0;
            next.disabled = page >= total - 1;
        };

        const render = async () => {
            const file = files[0];
            stage.innerHTML = "";
            if (file && file.type === "application/pdf") {
                if (!pdfDocument) {
                    const pdfjs = await import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs");
                    pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";
                    pdfDocument = await pdfjs.getDocument(file.url).promise;
                    pdfPages = pdfDocument.numPages;
                }
                const pdfPage = await pdfDocument.getPage(page + 1);
                const viewport = pdfPage.getViewport({ scale: 1.35 });
                const canvas = document.createElement("canvas");
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                await pdfPage.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
                stage.appendChild(canvas);
            } else {
                const image = document.createElement("img");
                image.src = files[page].url;
                image.alt = files[page].name;
                stage.appendChild(image);
            }
            updateControls();
        };

        previous.addEventListener("click", () => { if (page > 0) { page -= 1; render(); } });
        next.addEventListener("click", () => { const total = pdfDocument ? pdfPages : files.length; if (page < total - 1) { page += 1; render(); } });
        render().catch(() => { stage.innerHTML = "<p class='viewer-error'>This page could not be loaded. Please try again.</p>"; });
    });
});