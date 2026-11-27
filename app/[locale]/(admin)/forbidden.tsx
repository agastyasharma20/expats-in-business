// Sits above the layout that checks access, so forbidden() from that layout reaches a boundary
// (a forbidden.tsx beside the root layout is not used) and the response is a real 403.
export { default } from "../forbidden";
