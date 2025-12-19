type ImageTransformOptions = {
    width?: number;
    height?: number;
    quality?: number;
};

export const getOptimizedSupabaseImageUrl = (
    url: string | null | undefined,
    options: ImageTransformOptions = {}
): string | null => {
    if (!url) return null;

    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        return url;
    }

    const objectPrefix = '/storage/v1/object/public/';
    const renderPrefix = '/storage/v1/render/image/public/';

    if (parsed.pathname.includes(objectPrefix)) {
        parsed.pathname = parsed.pathname.replace(objectPrefix, renderPrefix);
    } else if (!parsed.pathname.includes(renderPrefix)) {
        return url;
    }

    const { width, height, quality } = options;
    if (typeof width === 'number') parsed.searchParams.set('width', String(width));
    if (typeof height === 'number') parsed.searchParams.set('height', String(height));
    if (typeof quality === 'number') parsed.searchParams.set('quality', String(quality));

    return parsed.toString();
};

