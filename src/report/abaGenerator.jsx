export const generateABA = (shopName, staffList) => {
    const date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '');
    
    // 1. Descriptive Record (Header)
    let aba = `0                 01CBA       AROI PAYROLL              000000PAYROLL   ${date}                                        \n`;

    let totalNet = 0;
    let count = 0;

    staffList.forEach(emp => {
        if (emp.total <= 0) return;
        
        // Clean Bank Info (Expected format: "BSB ACC")
        const bankClean = emp.bank.replace(/[^0-9]/g, '');
        const bsb = bankClean.substring(0, 6);
        const acc = bankClean.substring(6).padEnd(9, ' ');
        const amount = Math.round(emp.total * 100).toString().padStart(10, '0');
        const name = emp.name.substring(0, 32).padEnd(32, ' ');

        // 2. Detail Record (One per staff)
        aba += `1${bsb}${acc} 53${amount}${name}AROI WAGES  ${bsb}12345678AROI PAYROLL    00000000\n`;
        
        totalNet += Math.round(emp.total * 100);
        count++;
    });

    // 3. File Total Record
    const finalTotal = totalNet.toString().padStart(10, '0');
    const finalCount = count.toString().padStart(6, '0');
    aba += `7999-999            ${finalTotal}${finalTotal}0000000000                        ${finalCount}                        `;

    // Trigger Download
    const blob = new Blob([aba], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ABA_${shopName.replace(/\s+/g, '_')}_${date}.aba`;
    link.click();
};