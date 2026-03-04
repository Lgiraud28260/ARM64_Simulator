// main.js - Bootstrap + wiring
import { UIController } from './ui/ui-controller.js';

document.addEventListener('DOMContentLoaded', () => {
    window.app = new UIController();
});
