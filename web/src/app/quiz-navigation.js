function updateNavigationLabels(){
  backToSetup.textContent=T[lang].backToSetup;
  setupHome.textContent=T[lang].backHome;
  quizHome.textContent=lang==='zh'?'稍后继续':'Finish later';
  quizHome.title=lang==='zh'?'当前答案会自动保存，4小时内可以继续':'Answers are saved automatically for 4 hours';
}

function returnToSetup(){
  questions=[];answers=[];current=0;graded=false;quizStartedAt=0;
  quizView.hidden=true;lessonDemoView.hidden=true;setup.hidden=false;score.style.display='none';dots.innerHTML='';content.innerHTML='';
}

updateNavigationLabels();
new MutationObserver(updateNavigationLabels).observe(document.documentElement,{
  attributes:true,
  attributeFilter:['lang']
});
