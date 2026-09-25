export function jumpToDiv(divId = '') {

    document.location = document.location.toString().split('#')[0] + '#' + divId;

}