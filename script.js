// Simple alert on form submit
const form = document.querySelector("form");

form.addEventListener("submit", function(e) {
    e.preventDefault(); // prevent actual submission
    alert("Thank you! Your application has been submitted.");
    form.reset();
});