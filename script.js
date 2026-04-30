// Simple alert on form submit
const form = document.querySelector("form");

if (form) {
    form.addEventListener("submit", function(e) {
        e.preventDefault(); // prevent actual submission
        
        const message = "Thank you! Your application has been received. Our team will contact you shortly.";
        
        if (typeof DB !== 'undefined' && DB.showToast) {
            DB.showToast(message, 'success');
        } else {
            // Fallback for pages where DB is not loaded
            const toast = document.createElement('div');
            toast.style.cssText = "position:fixed; top:20px; right:20px; background:#2ecc71; color:white; padding:12px 24px; border-radius:8px; z-index:9999; font-weight:600; box-shadow:0 4px 12px rgba(0,0,0,0.15); transition:0.3s;";
            toast.innerText = message;
            document.body.appendChild(toast);
            setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
        }
        
        form.reset();
    });
}