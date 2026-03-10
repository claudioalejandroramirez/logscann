/**
 * UIController - Controle de abas, swipe e renderização de fotos
 */
class UIController {
    constructor() {
        this.currentTab = 0;
        this.totalTabs = 4;
        this.bindSwipe();
    }

    goToTab(index) {
        if (index < 0 || index >= this.totalTabs) return;
        this.currentTab = index;
        document.querySelectorAll('.page').forEach((el, i) => el.classList.toggle('active', i === index));
        document.querySelectorAll('.tab-link').forEach((el, i) => el.classList.toggle('active', i === index));
        if (index === 3) document.getElementById('exportSummary').textContent = app.export.getSummary();
    }

    nextTab() { this.goToTab(this.currentTab + 1); }
    prevTab() { this.goToTab(this.currentTab - 1); }

    bindSwipe() {
        let touchstartX = 0, touchendX = 0;
        const container = document.getElementById('swipeContainer');
        container.addEventListener('touchstart', e => { touchstartX = e.changedTouches[0].screenX; }, { passive: true });
        container.addEventListener('touchend', e => {
            touchendX = e.changedTouches[0].screenX;
            if (touchendX < touchstartX - 60) this.nextTab();
            if (touchendX > touchstartX + 60) this.prevTab();
        }, { passive: true });
    }

    renderPhotos() {
        const grid = document.getElementById('photosGrid');
        grid.innerHTML = '';
        const photos = app.session.photos;
        photos.forEach((item, i) => {
            const src = typeof item === 'string' ? item : item.src;
            const label = typeof item === 'string' ? null : item.label;
            const slot = document.createElement('div');
            slot.className = 'photo-slot';
            slot.innerHTML = `<img src="${src}">` +
                (label ? `<span class="photo-label">${label}</span>` : '') +
                `<button class="photo-del" onclick="event.stopPropagation(); app.session.removePhoto(${i})">X</button>`;
            grid.appendChild(slot);
        });
        for (let i = photos.length; i < 8; i++) {
            const slot = document.createElement('div');
            slot.className = 'photo-slot' + (i === photos.length ? ' live' : '');
            slot.textContent = i === photos.length ? '+' : '○';
            if (i === photos.length) slot.onclick = () => document.getElementById('inputPhoto').click();
            grid.appendChild(slot);
        }
        document.getElementById('photoCountText').textContent = photos.length;
        document.getElementById('btnClearPhotos').classList.toggle('hidden', photos.length === 0);
    }
}
