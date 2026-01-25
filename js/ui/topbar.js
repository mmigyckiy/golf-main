export function renderTopbar({ conditions, windSpeed, windDir } = {}){
  const condEl = document.getElementById("statConditionsValue");
  const windEl = document.getElementById("statWindValue");
  if(condEl) condEl.textContent = conditions || "—";
  if(windEl){
    if(windSpeed == null || windDir == null){
      windEl.textContent = "—";
    }else{
      const dir = windDir === -1 ? "←" : "→";
      windEl.textContent = `${windSpeed} mph ${dir}`;
    }
  }
}
