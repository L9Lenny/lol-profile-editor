import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement the native <dialog> API — polyfill it for tests
HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
    this.dispatchEvent(new Event('open'));
};

HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
};
