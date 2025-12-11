'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KeyRound, Mail, Globe, Shield, AlertCircle } from 'lucide-react';

const License = () => {
    const [userRole, setUserRole] = useState("");
    const [username, setUsername] = useState("");

    // Get user info from sessionStorage
    useEffect(() => {
        const storedRole = sessionStorage.getItem('role') || 'user';
        const storedUsername = sessionStorage.getItem('username') || 'User';
        setUserRole(storedRole);
        setUsername(storedUsername);
    }, []);

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
                        <KeyRound className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">License Agreement</h1>
                        <p className="text-muted-foreground">Software license terms and conditions</p>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 gap-6 max-w-4xl">
                {/* Copyright Notice Card */}
                <Card className="border-2 border-blue-200 dark:border-blue-800">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            Copyright Notice
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="space-y-4">
                            <div className="text-center">
                                <h2 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-4">
                                    © BOTIVATE SERVICES LLP
                                </h2>
                                <p className="text-lg leading-relaxed text-foreground">
                                    This software is developed exclusively by Botivate Services LLP for use by its clients.
                                </p>
                            </div>
                            
                            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex gap-3">
                                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-amber-900 dark:text-amber-200">
                                    <strong>Warning:</strong> Unauthorized use, distribution, or copying of this software is strictly prohibited and may result in legal action.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* License Terms Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>License Terms</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3">
                            <div>
                                <h3 className="font-semibold text-lg mb-2">1. Grant of License</h3>
                                <p className="text-muted-foreground">
                                    Botivate Services LLP grants you a non-exclusive, non-transferable license to use this software solely for your internal business operations.
                                </p>
                            </div>

                            <div>
                                <h3 className="font-semibold text-lg mb-2">2. Restrictions</h3>
                                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                    <li>You may not modify, adapt, or create derivative works</li>
                                    <li>You may not reverse engineer, decompile, or disassemble the software</li>
                                    <li>You may not distribute, sublicense, or transfer the software to third parties</li>
                                    <li>You may not remove or alter any copyright notices</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="font-semibold text-lg mb-2">3. Intellectual Property</h3>
                                <p className="text-muted-foreground">
                                    All intellectual property rights in and to the software remain the exclusive property of Botivate Services LLP.
                                </p>
                            </div>

                            <div>
                                <h3 className="font-semibold text-lg mb-2">4. Support and Maintenance</h3>
                                <p className="text-muted-foreground">
                                    Technical support and software updates are provided as per the terms of your service agreement.
                                </p>
                            </div>

                            <div>
                                <h3 className="font-semibold text-lg mb-2">5. Termination</h3>
                                <p className="text-muted-foreground">
                                    This license is effective until terminated. Botivate Services LLP may terminate this license if you fail to comply with any terms.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Contact Information Card */}
                <Card className="border-2 border-blue-200 dark:border-blue-800">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
                        <CardTitle className="flex items-center gap-2">
                            <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            Contact Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <p className="text-center mb-6 text-muted-foreground">
                            For license inquiries or technical support, please contact our support team:
                        </p>
                        
                        <div className="space-y-4">
                            <div className="flex items-center justify-center gap-3 p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                                <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                <a 
                                    href="mailto:info@botivate.in" 
                                    className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
                                >
                                    info@botivate.in
                                </a>
                            </div>

                            <div className="flex items-center justify-center gap-3 p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                                <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                <a 
                                    href="https://www.botivate.in" 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
                                >
                                    www.botivate.in
                                </a>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Footer Card */}
                <Card className="bg-muted/50">
                    <CardContent className="pt-6">
                        <p className="text-center text-sm text-muted-foreground">
                            <strong>Note:</strong> By using this software, you acknowledge that you have read, understood, and agree to be bound by the terms of this license agreement.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default License;
