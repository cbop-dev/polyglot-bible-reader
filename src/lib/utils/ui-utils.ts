import { resolve } from "$app/paths";
import { page } from "$app/state";
export function jumpToDiv(divId = '') {

    document.location = document.location.toString().split('#')[0] + '#' + divId;

}

export function getBaseurl(){
    return page.url.protocol+"//"+page.url.hostname+(page.url.port ? ":"+page.url.port:'')+resolve("/");
}
// Function to find the topmost <div> matching a CSS query
export  function findTopmostDiv(cssQuery:string): Element|null{
    // Select all matching <div> elements
    const divs = document.querySelectorAll('div' + cssQuery);
    let topmostDiv = null;
    let smallestTop = Infinity;

    // Iterate through the selected <div> elements
    divs.forEach(div => {
        const rect = div.getBoundingClientRect();
        // Check if the current <div> is within the viewport
        if (rect.top >= 0 && rect.bottom <= window.innerHeight) {
            // Update the topmost <div> if this one is higher
            if (rect.top < smallestTop) {
                smallestTop = rect.top;
                topmostDiv = div;
            }
        }
    });

    return topmostDiv; // Return the topmost <div> or null if none found
}

// Usage example
//const topDiv = findTopmostDiv('.my-class'); // Replace '.my-class' with your CSS query
//console.log(topDiv); // Logs the topmost <div> or null
