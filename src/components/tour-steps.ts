
export interface TourStep {
    selector: string;
    content: string;
}

export const tourSteps: TourStep[] = [
    {
        selector: '#sticker-shape-section',
        content: 'the sticker shape selector where users can choose from various shapes like die-cut, circle, or square.',
    },
    {
        selector: '#layer-section',
        content: 'the design area where users can generate a sticker with AI, upload their own image, or add text.',
    },
    {
        selector: '#canvas-container',
        content: 'the main canvas, which is the workspace for creating the sticker design.',
    },
    {
        selector: '#material-section',
        content: 'the material selection area, where users pick the sticker material like vinyl or holographic.',
    },
    {
        selector: '#quantity-section',
        content: 'the quantity and pricing section.',
    },
    {
        selector: '#add-to-cart-section',
        content: 'the final "Add to Cart" button.',
    },
];
