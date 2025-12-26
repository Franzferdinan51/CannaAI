"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from "lucide-react";

interface SensorChartProps {
    title: string;
    dataKey: string;
    color: string;
    unit: string;
    roomId?: string;
}

export function SensorChart({ title, dataKey, color, unit, roomId }: SensorChartProps) {
    const [timeframe, setTimeframe] = useState('24h');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const { data, isLoading, error } = useQuery({
        queryKey: ['analytics', dataKey, timeframe, roomId],
        queryFn: async () => {
            const params = new URLSearchParams({ timeframe });
            if (roomId) params.append('roomId', roomId);

            const res = await fetch(`/api/analytics?${params.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch analytics');
            return res.json();
        },
        refetchInterval: 60000 // Refresh every minute
    });

    if (!mounted) return null;

    const chartData = data?.data || [];

    return (
        <Card className="col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    {title} History
                </CardTitle>
                <Select value={timeframe} onValueChange={setTimeframe}>
                    <SelectTrigger className="w-[100px] h-8 text-xs">
                        <SelectValue placeholder="Timeframe" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="24h">24 Hours</SelectItem>
                        <SelectItem value="7d">7 Days</SelectItem>
                        <SelectItem value="30d">30 Days</SelectItem>
                    </SelectContent>
                </Select>
            </CardHeader>
            <CardContent>
                <div className="h-[250px] w-full mt-4">
                    {isLoading ? (
                        <div className="h-full w-full flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : error ? (
                        <div className="h-full w-full flex items-center justify-center text-red-500 text-xs">
                            Error loading data
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis
                                    dataKey="name"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    className="text-muted-foreground"
                                />
                                <YAxis
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    className="text-muted-foreground"
                                    unit={unit}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--background))',
                                        borderColor: 'hsl(var(--border))',
                                        borderRadius: 'var(--radius)',
                                    }}
                                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey={dataKey}
                                    stroke={color}
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={{ r: 4 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}