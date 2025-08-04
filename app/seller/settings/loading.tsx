import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function SellerSettingsLoading() {
    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">
                    {/* Header Skeleton */}
                    <div className="flex items-center gap-4 mb-8">
                        <Skeleton className="h-8 w-32" />
                    </div>

                    <div className="mb-8">
                        <Skeleton className="h-8 w-64 mb-2" />
                        <Skeleton className="h-4 w-96" />
                    </div>

                    {/* Tabs Skeleton */}
                    <div className="space-y-6">
                        <Skeleton className="h-10 w-48" />

                        <Card>
                            <CardHeader>
                                <Skeleton className="h-6 w-32" />
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <Skeleton className="h-4 w-20 mb-2" />
                                            <Skeleton className="h-10 w-full" />
                                        </div>
                                        <div>
                                            <Skeleton className="h-4 w-24 mb-2" />
                                            <Skeleton className="h-10 w-full" />
                                        </div>
                                    </div>

                                    <div>
                                        <Skeleton className="h-4 w-24 mb-2" />
                                        <Skeleton className="h-24 w-full" />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <Skeleton className="h-4 w-16 mb-2" />
                                            <Skeleton className="h-10 w-full" />
                                        </div>
                                        <div>
                                            <Skeleton className="h-4 w-24 mb-2" />
                                            <Skeleton className="h-10 w-full" />
                                        </div>
                                    </div>

                                    <Skeleton className="h-10 w-32" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
} 