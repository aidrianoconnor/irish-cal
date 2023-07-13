
function makeDateFromDataObj(dataObj) {
    var time = dataObj.time.split(':');
    var date = new Date(Date.UTC(dataObj.year, dataObj.month-1, dataObj.day, parseInt(time[0]), parseInt(time[1])));
    return date;
}

function daysBetweenDates(startDate, endDate) {
    return (endDate - startDate) / 86400000
}

function prepCalData(calData) {
    var cData = calData.data;
    for(var i = 0; i < cData.length; i++) {
        cData[i].fullDate = makeDateFromDataObj(cData[i]);
    }
}

function processCalendarType(calData, calLabel, today) {

    var cData = calData.data;

    var lastCalIndex, nextCalIndex;
    for(var i = 0; i < cData.length; i++) {
      if(today - cData[i].fullDate > -1) {
        lastCalIndex = i;
      }
    }
    nextCalIndex = lastCalIndex+1;
    cData[lastCalIndex].lastSubcycleStart = true;
    cData[nextCalIndex].nextSubcycleStart = true;


    calData.subcycle = {};
    calData.subcycle.daysPastLastCalDate = (daysBetweenDates(cData[lastCalIndex].fullDate, today));
    calData.subcycle.daysBetweenLastAndAndNextCal = (daysBetweenDates(cData[lastCalIndex].fullDate, cData[nextCalIndex].fullDate));
    calData.subcycle.daysRemainingInThisCal = calData.subcycle.daysBetweenLastAndAndNextCal - calData.subcycle.daysPastLastCalDate;
    calData.subcycle.percProgressToNextCal = ((calData.subcycle.daysPastLastCalDate / calData.subcycle.daysBetweenLastAndAndNextCal) * 100);

    calData.subcycle.labels = {};
    calData.subcycle.labels.lastPhenom = cData[lastCalIndex].phenom;
    calData.subcycle.labels.nextPhenom = cData[nextCalIndex].phenom;

    calData.subcycle.subdivisions = [];
    for(var i=lastCalIndex; i<nextCalIndex+1; i++) {
      var obj = {};
      obj.phenom = cData[i].phenom;
      obj.daysPastlastCalDate = (daysBetweenDates(cData[lastCalIndex].fullDate, cData[i].fullDate));
      obj.percProgressToNextCal = ((obj.daysPastlastCalDate / calData.subcycle.daysBetweenLastAndAndNextCal) * 100);
      calData.subcycle.subdivisions.push(obj);
    }

    var html = '<p>';
    html += 'Today is day ' + Math.round(calData.subcycle.daysPastLastCalDate) + ' out of ' + Math.round(calData.subcycle.daysBetweenLastAndAndNextCal) + ' days in the period of ' + cData[lastCalIndex].phenom + ', ';
    html += 'or ' + Math.round(calData.subcycle.percProgressToNextCal) + '% through the period.<br />';
    html += Math.round(calData.subcycle.daysRemainingInThisCal) + ' days remain until ' + cData[nextCalIndex].phenom + '.<br /></p>';

    calData.subcycle.labels.verbose = html;


    var lastCalIndex, nextCalIndex;
    for(var i = 0; i < cData.length; i++) {
        if(cData[i].phenom == calData.cycleStartPhenom) {
          if(today - cData[i].fullDate > -1) {
            lastCalIndex = i;
          }
        }
    }
    for(var i = cData.length-1; i > -1; i--) {
      if(cData[i].phenom == calData.cycleStartPhenom) {
        if(today - cData[i].fullDate < 0) {
          nextCalIndex = i;
        }
      }
    }

    cData[lastCalIndex].lastCycleStart = true;
    cData[nextCalIndex].nextCycleStart = true;

    calData.cycle = {};
    calData.cycle.daysPastLastCalDate = (daysBetweenDates(cData[lastCalIndex].fullDate, today));
    calData.cycle.daysBetweenLastAndAndNextCal = (daysBetweenDates(cData[lastCalIndex].fullDate, cData[nextCalIndex].fullDate));
    calData.cycle.daysRemainingInThisCal = calData.cycle.daysBetweenLastAndAndNextCal - calData.cycle.daysPastLastCalDate;
    calData.cycle.percProgressToNextCal = ((calData.cycle.daysPastLastCalDate / calData.cycle.daysBetweenLastAndAndNextCal) * 100);

    calData.cycle.labels = {};
    calData.cycle.labels.lastPhenom = cData[lastCalIndex].phenom;
    calData.cycle.labels.nextPhenom = cData[nextCalIndex].phenom;

    calData.cycle.subdivisions = [];
    for(var i=lastCalIndex; i<nextCalIndex+1; i++) {
      var obj = {};
      obj.phenom = cData[i].phenom;
      obj.daysPastlastCalDate = (daysBetweenDates(cData[lastCalIndex].fullDate, cData[i].fullDate));
      obj.percProgressToNextCal = ((obj.daysPastlastCalDate / calData.cycle.daysBetweenLastAndAndNextCal) * 100);
      calData.cycle.subdivisions.push(obj);
    }

    var html = '<p>';
    html += 'Today is day ' + Math.round(calData.cycle.daysPastLastCalDate) + ' out of ' + Math.round(calData.cycle.daysBetweenLastAndAndNextCal) + ' days in the period of ' + cData[lastCalIndex].phenom + ', ';
    html += 'or ' + Math.round(calData.cycle.percProgressToNextCal) + '% through the period.<br />';
    html += Math.round(calData.cycle.daysRemainingInThisCal) + ' days remain until ' + cData[nextCalIndex].phenom + '.<br /></p>';

    calData.cycle.labels.verbose = html;

}



// UI drawing functions

function makeLine(rotateAmt, unit, strokeWidth, strokeColor, radiusFactor) {
    var lineCanvas = document.createElement('canvas');
    lineCanvas.width = 2;
    lineCanvas.height = (unit*radiusFactor)+strokeWidth;
    context = lineCanvas.getContext("2d");
    context.moveTo(1, (unit*radiusFactor)-strokeWidth);
    context.lineTo(1, (unit*radiusFactor)+strokeWidth);
    context.lineWidth = 2;
    context.strokeStyle = strokeColor;
    context.stroke();
    lineCanvas.style.position = "absolute";
    lineCanvas.style.left = (unit/2)+"px";
    lineCanvas.style.top = (unit/2)+"px";
    lineCanvas.style.zIndex = "100";
    lineCanvas.style.transformOrigin = '50% top';
    lineCanvas.style.transform = 'rotate('+rotateAmt+'turn)';
    return lineCanvas;
}

function makeDivisionLines(wrapDiv, unit, strokeWidth, radiusFactor, numDivisions, strokeColor, baseRotation) {
    var divPerc = 1 / numDivisions;
    for(var i=0; i<numDivisions; i++) {
        wrapDiv.appendChild(makeLine((i*divPerc)+baseRotation, unit, strokeWidth, strokeColor, radiusFactor));
    }
}

function makeRingLabels(labels, cms, unit, strokeWidth, radiusFactor, wrapDiv, baseRotation) {
    for(var i=0; i<labels.length; i++) {
        var lblCanvas = document.createElement('canvas');
        lblCanvas.width = strokeWidth * 10;
        lblCanvas.height = strokeWidth;
        var context = lblCanvas.getContext("2d");
        context.font = strokeWidth+"px Arial";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillStyle = "black";
        context.fillText(labels[i], strokeWidth*5, strokeWidth/2);
        lblCanvas.style.position = "absolute";
        lblCanvas.style.left = ((unit/2)-(strokeWidth*5))+"px";
        lblCanvas.style.top = ((unit/2)-(strokeWidth/2))+"px";
        lblCanvas.style.zIndex = "200";
        lblCanvas.style.transformOrigin = '50% 50%';
        lblCanvas.style.transform = 'rotate('+ ((i*.25)+baseRotation)+'turn) translateY(-'+((unit*radiusFactor)+(strokeWidth*1.05))+'px)';
        $(lblCanvas).data('cms', cms[i]);
        wrapDiv.appendChild(lblCanvas);

        $(lblCanvas).on('click', function(e) {
          labelClickHandler(e);
        })
    }
}

function labelClickHandler(e) {
  var t = $(e.target);

  var resources = t.data('cms').split(',');
  var html = '';
  var link, i, c;

  for(i=0; i<resources.length; i++) {
    html += '<div class="group">';
    html += '<p class="title">' + cms[resources[i]].title + '</p>';
    html += '<ul>';
    for(c=0; c<cms[resources[i]].links.length; c++) {
      link = cms[resources[i]].links[c];
      if(link.who != '') {
        html += '<li>';
        html += '<a href="' + link.where + '" target="_blank">' + link.what + '</a><br />';
        html += link.how + ' | ' + link.who + ' | ' + link.when;
        html += '</li>';
      }
    }
    html += '</ul>';
    html += '</div>';
  }

  $('#resources').html(html);

  window.scrollTo(0, 1000);
}

function makePointer(wrapDiv, unit, strokeWidth, radiusFactor, turn) {
    var canvas = document.createElement('canvas');
    canvas.width = strokeWidth*2;
    canvas.height = strokeWidth*2;
    var context = canvas.getContext("2d");
    context.moveTo(strokeWidth, 0);
    context.lineTo(strokeWidth*2, strokeWidth*2);
    context.lineTo(0, strokeWidth*2);
    context.lineTo(strokeWidth, 0);
    context.fillStyle = "black";
    context.fill();
    canvas.style.position = "absolute";
    canvas.style.left = ((unit/2)-strokeWidth)+"px";
    canvas.style.top = ((unit/2)-strokeWidth)+"px";
    canvas.style.zIndex = "300";
    canvas.style.transformOrigin = '50% 50%';
    canvas.style.transform = 'rotate('+turn+'turn) translateY(-'+((unit*radiusFactor)-(strokeWidth*1.5))+'px)';
    wrapDiv.appendChild(canvas);
}

function makeFullCircleUI(wrapDivID, unit, strokeWidth, radiusFactor, subdivs, subdivColor, strokeStartColor, strokeEndColor, calData, baseRotation) {
    var wrapDiv = document.getElementById(wrapDivID);
    wrapDiv.style.width = unit+'px';
    wrapDiv.style.height = unit+'px';
    wrapDiv.style.position = 'absolute';
    wrapDiv.style.left = '0';
    wrapDiv.style.top = '0';

    var canvas = document.createElement('canvas');
    canvas.width = unit;
    canvas.height = unit;
    var context = canvas.getContext("2d");

    context.arc(unit/2, unit/2, unit*radiusFactor, 0, 2 * Math.PI, false);
    context.lineWidth = strokeWidth;
    var grd = context.createLinearGradient(unit, unit*.3, canvas.width, canvas.height);
    grd.addColorStop(.0, strokeStartColor);
    grd.addColorStop(.5, strokeEndColor);
    context.strokeStyle = grd;
    context.stroke();
    canvas.style.position = "absolute";
    canvas.style.left = "0px";
    canvas.style.top = "0px";
    canvas.style.zIndex = "1";
    wrapDiv.appendChild(canvas);

    makeDivisionLines(wrapDiv, unit, strokeWidth, radiusFactor, subdivs, subdivColor, baseRotation);

    makeRingLabels(calData.cycleLables,calData.cycleLblCMS, unit, strokeWidth, radiusFactor, wrapDiv, baseRotation);

    makePointer(wrapDiv, unit, strokeWidth, radiusFactor, (calData.cycle.percProgressToNextCal/100)+baseRotation);

}


function drawUI() {

    // clear out old UI - doing this manually per element to ensure dumping of all memory/events/listeners
    if($('fireFestivalWrap').length) {
        $('fireFestivalWrap').remove();
        $('#solarWrap').remove();
        $('#lunarWrap').remove();
        $('#pointersWrap').remove();
        $('#timepiece').remove();
    }

    var UI = $('#ui');
    var html = '';
    html += '<div id="timepiece">';
    html += '<div id="fireFestivalWrap"></div>';
    html += '<div id="solarWrap"></div>';
    html += '<div id="lunarWrap"></div>';
    html += '<div id="pointersWrap"></div>';
    html += '</div>';
    html += '<div id="resources"></div>';
    html += '';
    UI.html(html);

    var unit = 550;
    var win = $(window);
    if(win.width() > win.height()) {
      unit = win.height() - (win.height() * .05);
    } else {
      unit = win.width() - (win.width() * .05);
    }
    UI.width(win.width());
    //console.log(win.width());

    var strokeWidth = unit * .02;

    makeFullCircleUI('solarWrap', unit, strokeWidth, .4, 12, '#fff', '#0ff', '#02c819', seasonsData, 0);
    makeFullCircleUI('fireFestivalWrap', unit, strokeWidth, .3, 12, '#fff', '#000', '#ff6000', fireFestivalsData, -.125);
    makeFullCircleUI('lunarWrap', unit, strokeWidth, .18, 29, '#fff', '#000', '#ff0', moonData, 0);

    var timepiece = document.getElementById('timepiece');
    timepiece.style.background = 'white';
    timepiece.style.border = '1px solid black';
    timepiece.style.position = 'relative';
    timepiece.style.width = unit + 'px';
    timepiece.style.height = unit + 'px';
    timepiece.style.margin = '0 auto';

    var lblCanvas = $('<p>Click labels to load resources below.</p>');
    // lblCanvas.width(strokeWidth * 10);
    // lblCanvas.height(strokeWidth * 3);
    lblCanvas.css({
      'width' : unit,
      'position' : 'absolute',
      'left': 0,
      'bottom' : 0,
      'text-align' : 'center',
      'padding' : 0,
      'margin' : 0
    });
    $(timepiece).append(lblCanvas);

    var resources = document.getElementById('resources');
    resources.style.width = unit + 'px';
    resources.style.background = 'white';
    resources.style.border = '1px solid black';
    resources.style.margin = '1rem auto';

}


var RESIZETIMER;

// final init

function appInit() {

    prepCalData(seasonsData);
    prepCalData(fireFestivalsData);
    prepCalData(moonData);

    var today = new Date();

    // gets the data ready
    processCalendarType(fireFestivalsData, 'Fire Festival', today);
    processCalendarType(seasonsData, 'Solar Season', today);
    processCalendarType(moonData, 'Moon Phase', today);

    // drawing UI
    drawUI();

    $(window).on('resize', function() {
        clearTimeout(RESIZETIMER);
        RESIZETIMER = setTimeout(drawUI, 1000);
    })

};


