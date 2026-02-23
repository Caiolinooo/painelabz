import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';

// Register fonts if needed (optional, standard fonts work)

const styles = StyleSheet.create({
    page: {
        padding: 30,
        fontSize: 10,
        fontFamily: 'Helvetica',
        color: '#333'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
        paddingBottom: 10
    },
    logo: {
        width: 100,
        height: 40,
        objectFit: 'contain'
    },
    titleContainer: {
        textAlign: 'right'
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#0066FF'
    },
    subtitle: {
        fontSize: 10,
        color: '#666'
    },
    section: {
        marginBottom: 10,
        padding: 10,
        backgroundColor: '#f9fafb',
        borderRadius: 4
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 2
    },
    row: {
        flexDirection: 'row',
        marginBottom: 2
    },
    label: {
        width: 100,
        fontWeight: 'bold',
        color: '#555'
    },
    value: {
        flex: 1
    },
    table: {
        marginTop: 20,
        marginBottom: 20
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#0066FF',
        color: 'white',
        padding: 5,
        fontSize: 9,
        fontWeight: 'bold'
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        padding: 5,
        fontSize: 9
    },
    colDesc: { flex: 3 },
    colQty: { flex: 1, textAlign: 'center' },
    colUnit: { flex: 1, textAlign: 'right' },
    colTotal: { flex: 1, textAlign: 'right' },

    totals: {
        marginTop: 10,
        alignSelf: 'flex-end',
        width: 200,
        padding: 10,
        backgroundColor: '#f0f7ff',
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#dbeafe'
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4
    },
    totalLabel: {
        fontWeight: 'bold'
    },
    totalValue: {
        fontWeight: 'bold',
        color: '#0066FF'
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 30,
        right: 30,
        textAlign: 'center',
        fontSize: 8,
        color: '#999',
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingTop: 10
    }
});

// Create Document Component
export const PurchaseOrderPdf = ({ data }: { data: any }) => {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString();
    };

    return (
        <Document>
            <Page size="A4" style={styles.page}>

                {/* Header */}
                <View style={styles.header}>
                    <View>
                        {/* Use a public URL or base64 for logo if needed. Assuming generic text if image fails */}
                        <Text style={{ fontSize: 16, fontWeight: 'bold' }}>Logo Empresa</Text>
                        {/* <Image src="/images/logo.png" style={styles.logo} /> */}
                    </View>
                    <View style={styles.titleContainer}>
                        <Text style={styles.title}>ORDEM DE COMPRA</Text>
                        <Text style={styles.subtitle}>#{data.po_number || 'PENDENTE'}</Text>
                        <Text style={styles.subtitle}>Data: {formatDate(data.requisition_date || data.created_at)}</Text>
                    </View>
                </View>

                {/* Info Grid */}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    {/* Provider */}
                    <View style={{ flex: 1, ...styles.section }}>
                        <Text style={styles.sectionTitle}>Fornecedor</Text>
                        <View style={styles.row}>
                            <Text style={styles.label}>Razão Social:</Text>
                            <Text style={styles.value}>{data.provider_name}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>CNPJ:</Text>
                            <Text style={styles.value}>{data.provider_cnpj}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Email:</Text>
                            <Text style={styles.value}>{data.provider_email}</Text>
                        </View>
                        {data.suppliers?.contact_phone && (
                            <View style={styles.row}>
                                <Text style={styles.label}>Telefone:</Text>
                                <Text style={styles.value}>{data.suppliers.contact_phone}</Text>
                            </View>
                        )}
                        <View style={styles.row}>
                            <Text style={styles.label}>Cond. Pagto:</Text>
                            <Text style={styles.value}>{data.payment_terms}</Text>
                        </View>
                        {data.suppliers?.bank_details && (
                            <View style={styles.row}>
                                <Text style={styles.label}>Dados Banc.:</Text>
                                <Text style={styles.value}>{data.suppliers.bank_details}</Text>
                            </View>
                        )}
                    </View>

                    {/* Delivery */}
                    <View style={{ flex: 1, ...styles.section }}>
                        <Text style={styles.sectionTitle}>Entrega / Cobrança</Text>
                        <View style={styles.row}>
                            <Text style={styles.label}>Comprador:</Text>
                            <Text style={styles.value}>{data.buyer_name}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Data Entrega:</Text>
                            <Text style={styles.value}>{formatDate(data.delivery_date)}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Endereço:</Text>
                            <Text style={styles.value}>{data.delivery_address}</Text>
                        </View>
                    </View>
                </View>

                {/* Items Table */}
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={styles.colDesc}>DESCRIÇÃO</Text>
                        <Text style={styles.colQty}>QTD</Text>
                        <Text style={styles.colUnit}>VALOR UNIT.</Text>
                        <Text style={styles.colUnit}>C. CUSTO</Text>
                        <Text style={styles.colTotal}>TOTAL</Text>
                    </View>
                    {data.items?.map((item: any, i: number) => (
                        <View key={i} style={styles.tableRow}>
                            <Text style={styles.colDesc}>{item.description}</Text>
                            <Text style={styles.colQty}>{item.quantity}</Text>
                            <Text style={styles.colUnit}>{formatCurrency(item.unit_value)}</Text>
                            <Text style={styles.colUnit}>{item.cost_center || '-'}</Text>
                            <Text style={styles.colTotal}>{formatCurrency(item.total_value)}</Text>
                        </View>
                    ))}
                </View>

                {/* Totals */}
                <View style={styles.totals}>
                    <View style={styles.totalRow}>
                        <Text>Subtotal:</Text>
                        <Text>{formatCurrency(data.items?.reduce((acc: number, item: any) => acc + item.total_value, 0) || 0)}</Text>
                    </View>
                    <View style={styles.totalRow}>
                        <Text>Frete:</Text>
                        <Text>{formatCurrency(data.freight_cost || 0)}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#ccc', paddingTop: 5, marginTop: 5 }}>
                        <Text style={styles.totalLabel}>TOTAL:</Text>
                        <Text style={styles.totalValue}>{formatCurrency(data.total_value)}</Text>
                    </View>
                </View>

                {/* Observation */}
                {data.observation && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Observações</Text>
                        <Text>{data.observation}</Text>
                    </View>
                )}

                {/* Footer */}
                <Text style={styles.footer}>
                    Documento gerado automaticamente pelo Portal ABZ. Este documento não possui validade fiscal sem a assinatura dos responsáveis.
                </Text>
            </Page>
        </Document>
    );
};
