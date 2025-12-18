import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BarChart, LineChart } from 'react-native-chart-kit';

interface DailySale {
    date: string;
    total: number;
    count: number;
}

interface SalesChartProps {
    data: DailySale[];
    title?: string;
}

type ChartType = 'bar' | 'line';
type ViewPeriod = '7d' | '30d';

const screenWidth = Dimensions.get('window').width - 48;

export function SalesChart({ data, title = 'Vendas' }: SalesChartProps) {
    const [chartType, setChartType] = useState<ChartType>('bar');
    const [viewPeriod, setViewPeriod] = useState<ViewPeriod>('7d');

    if (!data || data.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Ionicons name="bar-chart-outline" size={48} color={Colors.textMuted} />
                <Text style={styles.emptyText}>Sem dados de vendas</Text>
                <Text style={styles.emptySubtext}>Os dados aparecerão aqui quando você tiver vendas</Text>
            </View>
        );
    }

    // Filter data based on period
    const displayData = viewPeriod === '7d' ? data.slice(-7) : data;

    // Format labels to show only day/month
    const labels = displayData.map(d => {
        const date = new Date(d.date);
        return `${date.getDate()}/${date.getMonth() + 1}`;
    });

    const values = displayData.map(d => d.total);
    const counts = displayData.map(d => d.count);
    const totalSales = values.reduce((a, b) => a + b, 0);
    const totalOrders = counts.reduce((a, b) => a + b, 0);
    const avgDaily = totalSales / displayData.length;
    const maxValue = Math.max(...values, 1);

    // Calculate trend (comparing last 3 days to previous 3 days)
    const lastThree = values.slice(-3).reduce((a, b) => a + b, 0);
    const prevThree = values.slice(-6, -3).reduce((a, b) => a + b, 0);
    const trend = prevThree > 0 ? ((lastThree - prevThree) / prevThree) * 100 : 0;
    const trendPositive = trend >= 0;

    const chartData = {
        labels,
        datasets: [
            {
                data: values.length > 0 ? values : [0],
                color: (opacity = 1) => `rgba(5, 150, 105, ${opacity})`, // Verde #059669
                strokeWidth: 2,
            },
        ],
    };

    const chartConfig = {
        backgroundColor: 'transparent',
        backgroundGradientFrom: Colors.backgroundCard, // #FFFFFF
        backgroundGradientTo: Colors.backgroundCard, // #FFFFFF
        decimalPlaces: 0,
        color: (opacity = 1) => `rgba(5, 150, 105, ${opacity})`, // Verde #059669
        labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`, // Gray-500 #6B7280
        style: {
            borderRadius: 16,
        },
        propsForBackgroundLines: {
            strokeDasharray: '',
            stroke: '#E5E7EB', // Gray-200
            strokeWidth: 1,
        },
        barPercentage: 0.6,
        propsForDots: {
            r: '4',
            strokeWidth: '2',
            stroke: Colors.accent,
        },
    };

    return (
        <View style={styles.container}>
            {/* Header with controls */}
            <View style={styles.header}>
                <Text style={styles.title}>{title}</Text>
                <View style={styles.controls}>
                    {/* Chart type toggle */}
                    <View style={styles.toggleGroup}>
                        <TouchableOpacity
                            style={[styles.toggleButton, chartType === 'bar' && styles.toggleActive]}
                            onPress={() => setChartType('bar')}
                        >
                            <Ionicons
                                name="bar-chart"
                                size={16}
                                color={chartType === 'bar' ? Colors.text : Colors.textMuted}
                            />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.toggleButton, chartType === 'line' && styles.toggleActive]}
                            onPress={() => setChartType('line')}
                        >
                            <Ionicons
                                name="trending-up"
                                size={16}
                                color={chartType === 'line' ? Colors.text : Colors.textMuted}
                            />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Period selector */}
            <View style={styles.periodSelector}>
                <TouchableOpacity
                    style={[styles.periodButton, viewPeriod === '7d' && styles.periodActive]}
                    onPress={() => setViewPeriod('7d')}
                >
                    <Text style={[styles.periodText, viewPeriod === '7d' && styles.periodTextActive]}>
                        7 dias
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.periodButton, viewPeriod === '30d' && styles.periodActive]}
                    onPress={() => setViewPeriod('30d')}
                >
                    <Text style={[styles.periodText, viewPeriod === '30d' && styles.periodTextActive]}>
                        30 dias
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Chart */}
            <View style={styles.chartContainer}>
                {chartType === 'bar' ? (
                    <BarChart
                        data={chartData}
                        width={screenWidth}
                        height={180}
                        yAxisLabel="R$"
                        yAxisSuffix=""
                        chartConfig={chartConfig}
                        style={styles.chart}
                        fromZero
                        showValuesOnTopOfBars
                        withInnerLines={false}
                    />
                ) : (
                    <LineChart
                        data={chartData}
                        width={screenWidth}
                        height={180}
                        yAxisLabel="R$"
                        yAxisSuffix=""
                        chartConfig={chartConfig}
                        style={styles.chart}
                        bezier
                        withInnerLines={false}
                        withOuterLines={false}
                        withShadow={false}
                    />
                )}
            </View>

            {/* Trend indicator */}
            {values.length >= 6 && (
                <View style={[styles.trendBadge, trendPositive ? styles.trendUp : styles.trendDown]}>
                    <Ionicons
                        name={trendPositive ? "trending-up" : "trending-down"}
                        size={14}
                        color={trendPositive ? Colors.success : Colors.error}
                    />
                    <Text style={[styles.trendText, { color: trendPositive ? Colors.success : Colors.error }]}>
                        {trendPositive ? '+' : ''}{trend.toFixed(0)}% vs período anterior
                    </Text>
                </View>
            )}

            {/* Summary stats */}
            <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>
                        R$ {totalSales.toFixed(0)}
                    </Text>
                    <Text style={styles.summaryLabel}>Total</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>
                        {totalOrders}
                    </Text>
                    <Text style={styles.summaryLabel}>Pedidos</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>
                        R$ {avgDaily.toFixed(0)}
                    </Text>
                    <Text style={styles.summaryLabel}>Média/dia</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>
                        R$ {maxValue.toFixed(0)}
                    </Text>
                    <Text style={styles.summaryLabel}>Maior dia</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 24,
        marginTop: 24,
        padding: 16,
        backgroundColor: Colors.backgroundCard,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
    },
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    toggleGroup: {
        flexDirection: 'row',
        backgroundColor: Colors.glass,
        borderRadius: 8,
        padding: 2,
    },
    toggleButton: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
    },
    toggleActive: {
        backgroundColor: Colors.primary30,
    },
    periodSelector: {
        flexDirection: 'row',
        marginBottom: 16,
        gap: 8,
    },
    periodButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: Colors.glass,
    },
    periodActive: {
        backgroundColor: Colors.accent30,
    },
    periodText: {
        fontSize: 12,
        fontWeight: '500',
        color: Colors.textMuted,
    },
    periodTextActive: {
        color: Colors.accent,
    },
    chartContainer: {
        marginHorizontal: -8,
        alignItems: 'center',
    },
    chart: {
        borderRadius: 16,
    },
    trendBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        marginTop: 12,
        gap: 4,
    },
    trendUp: {
        backgroundColor: Colors.success20,
    },
    trendDown: {
        backgroundColor: Colors.error20,
    },
    trendText: {
        fontSize: 12,
        fontWeight: '500',
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: Colors.glassBorder,
    },
    summaryItem: {
        alignItems: 'center',
        flex: 1,
    },
    summaryDivider: {
        width: 1,
        height: 30,
        backgroundColor: Colors.glassBorder,
    },
    summaryValue: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
    },
    summaryLabel: {
        fontSize: 10,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    emptyContainer: {
        marginHorizontal: 24,
        marginTop: 24,
        padding: 32,
        backgroundColor: Colors.backgroundCard,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        alignItems: 'center',
        gap: 8,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.textMuted,
    },
    emptySubtext: {
        fontSize: 12,
        color: Colors.textMuted,
        textAlign: 'center',
    },
});
