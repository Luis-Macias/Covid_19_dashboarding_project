// console.log('hello world')
// var tooltip = d3.select('body')
//     .append('div')
// // source code from Mike Bostock 
// // can be found at <insert link here >
// // I've modfied it to be able to do similar 
// let time_parse = d3.timeParse("%Y-%m-%d")
// var startDate = time_parse("2020-03-00"); //YYYY-MM-DD
// var endDate = time_parse("2020-03-27"); //YYYY-MM-DD

// var getDateArray = function(start, end) {
//     var arr = new Array();
//     var dt = new Date(start);
//     while (dt <= end) {
//         console.log(dt)
//         arr.push(new Date(dt));
//         dt.setDate(dt.getDate() + 1);
//     }
//     return arr;
// }

// var dateArr = getDateArray(startDate, endDate);
// console.log(dateArr)


export function scrubber(values, container,{
  format = value => value,
  delay = null,
  autoplay = true,
  loop = true,
  alternate = false,
  initial = 0
} = {}) {
  values = Array.from(values);
  // let container = document.createElement('div');
  container.html(`<form style="font: 12px var(--sans-serif); display: flex; height: 33px; align-items: center;">
    <button name=b type=button style="margin-right: 0.4em; width: 5em;"></button>
    <label style="display: flex; align-items: center;">
      <input name=i type=range min=0 max=${values.length - 1} value=${initial} step=1 style="width: 180px;">
      <output name=o style="margin-left: 0.4em;"></output>
    </label>
  </form>`)
  const form = document.querySelector('form')
  console.log(form)
  let timer = null;
  let direction = 1;
  function start() {
    form.b.textContent = "Pause";
    timer = delay === null
      ? requestAnimationFrame(tick)
      : setInterval(tick, delay);
  }
  function stop() {
    form.b.textContent = "Play";
    if (delay === null) cancelAnimationFrame(timer);
    else clearInterval(timer);
    timer = null;
  }
  function tick() {
    if (delay === null) timer = requestAnimationFrame(tick);
    if (form.i.valueAsNumber === (direction > 0 ? values.length - 1 : direction < 0 ? 0 : NaN)) {
      if (!loop) return stop();
      if (alternate) direction = -direction;
    }
    form.i.valueAsNumber = (form.i.valueAsNumber + direction + values.length) % values.length;
    form.i.dispatchEvent(new CustomEvent("input", {bubbles: true}));
  }
  form.i.oninput = event => {
    if (event && event.isTrusted && timer) form.b.onclick();
    form.value = values[form.i.valueAsNumber];
    form.o.value = format(form.value, form.i.valueAsNumber, values);
  };
  form.b.onclick = () => {
    if (timer) return stop();
    direction = alternate && form.i.valueAsNumber === values.length - 1 ? -1 : 1;
    form.i.valueAsNumber = (form.i.valueAsNumber + direction) % values.length;
    form.i.dispatchEvent(new CustomEvent("input", {bubbles: true}));
    start();
  };
  form.i.oninput();
  if (autoplay) start();
  else stop();
  return form
}

// Scrubber(dateArr,tooltip,{
//   delay: 500,
//   loop: false,
//   format: d => d.toLocaleDateString()
// })