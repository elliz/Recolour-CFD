# Recolour-CFD
Tampermonkey script for recolourizing Cumulative Flow Diagrams on Microsoft Visual Studio Online kanban boards

## Instructions

* Install Tampermonkey
* Copy script from dist folder in this repo
* Create new tampermonkey script

* Navigate to kanban board in VSO (visual studio online)
* Click on CFD thumbnail in top right corner
* Once graph displays, double click it to change the colours.

## Notes

This is a quick-and-dirty implementation. I stopped work on it once it worked.

It finds the colours using a simple algorithm that looks for white columns from the right hand side of the image. If you have vertical whitespace rivers in the task type names it will fail.

Works in latest version of Chrome and Firefox ... not tested in other browsers.

It is possible to convert to a bookmarklet/favlet

Enjoy, like and fork.

