import React, { forwardRef } from 'react';
import { StandardTemplate, ElegantTemplate, ThermalTemplate } from './InvoiceTemplates';

/**
 * PrintWrapper - A persistent wrapper for the billing print system.
 * Uses forwardRef to allow react-to-print to target the rendered content.
 */
const PrintWrapper = forwardRef(({ snapshot, selectedDesign }, ref) => {
    // We always render the container so the print engine has a stable DOM target.
    // Content inside will only render once a snapshot is provided.

    return (
        <div ref={ref} id="print-wrapper" className="print-snapshot-container">
            {snapshot && (
                <>
                {selectedDesign === 'Standard' && (
                    <StandardTemplate
                        cart={snapshot.cart}
                        customer={snapshot.customer}
                        subtotal={snapshot.subtotal}
                        taxAmount={snapshot.taxAmount}
                        discAmount={snapshot.discAmount}
                        grandTotal={snapshot.grandTotal}
                        invoiceNo={snapshot.invoiceNo}
                        date={snapshot.date}
                        invType={snapshot.invType}
                        storeProfile={snapshot.storeProfile}
                        couponCode={snapshot.couponCode}
                    />
                )}
                {selectedDesign === 'Elegant' && (
                    <ElegantTemplate
                        cart={snapshot.cart}
                        customer={snapshot.customer}
                        subtotal={snapshot.subtotal}
                        taxAmount={snapshot.taxAmount}
                        discAmount={snapshot.discAmount}
                        grandTotal={snapshot.grandTotal}
                        invoiceNo={snapshot.invoiceNo}
                        date={snapshot.date}
                        invType={snapshot.invType}
                        storeProfile={snapshot.storeProfile}
                        couponCode={snapshot.couponCode}
                    />
                )}
                {selectedDesign === 'Thermal' && (
                    <ThermalTemplate
                        cart={snapshot.cart}
                        customer={snapshot.customer}
                        subtotal={snapshot.subtotal}
                        taxAmount={snapshot.taxAmount}
                        discAmount={snapshot.discAmount}
                        grandTotal={snapshot.grandTotal}
                        invoiceNo={snapshot.invoiceNo}
                        date={snapshot.date}
                        invType={snapshot.invType}
                        storeProfile={snapshot.storeProfile}
                        couponCode={snapshot.couponCode}
                    />
                )}
                </>
            )}
        </div>
    );
});

PrintWrapper.displayName = 'PrintWrapper';

export default PrintWrapper;
