import React from 'react';
import {
    FlatList,
    FlatListProps,
    StyleProp,
    UIManager,
    View,
    ViewStyle,
} from 'react-native';

type AdaptiveListProps<TItem> = FlatListProps<TItem> & {
    estimatedItemSize?: number;
    style?: StyleProp<ViewStyle>;
};

let FlashList: any = null;
try {
    FlashList = require('@shopify/flash-list').FlashList;
} catch {
    FlashList = null;
}

const isFlashListSupported = (): boolean => {
    try {
        return !!(UIManager as any)?.getViewManagerConfig?.('AutoLayoutView');
    } catch {
        return false;
    }
};

export function AdaptiveList<TItem>(props: AdaptiveListProps<TItem>) {
    const { estimatedItemSize, style, ...rest } = props as any;

    const numColumns = Number(rest?.numColumns || 0);
    const hasColumnWrapperStyle = rest?.columnWrapperStyle != null;
    const canUseFlashList =
        FlashList &&
        isFlashListSupported() &&
        !hasColumnWrapperStyle &&
        (numColumns <= 1);

    if (canUseFlashList) {
        return (
            <View style={style}>
                <FlashList {...rest} estimatedItemSize={estimatedItemSize} />
            </View>
        );
    }

    return <FlatList {...(rest as FlatListProps<TItem>)} style={style} />;
}
