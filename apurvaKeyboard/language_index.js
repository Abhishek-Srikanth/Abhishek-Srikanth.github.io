var lang = "TAMIL"

function reWritePage(language)
{
    switch(language)
    {
        case "TAMIL":
            document.getElementById("title").innerHTML = "அபூர்வா விசைப்பலகை";
            document.getElementById("navbar_title").innerHTML = "அபூர்வா விசைப்பலகை";
            document.getElementById("navbar_Demo").innerHTML = "உதாரணம்";
            document.getElementById("navbar_feedback").innerHTML = "யோசனை";
            document.getElementById("navbar_FAQ").innerHTML = "கெள்விகள்";
            document.getElementById("link_language_drop").innerHTML = "மொழிகள்";
            document.getElementById("txt_keyboardRedesigned").innerHTML = "விசைப்பலகையில் மறுவடிவம்";
            document.getElementById("txt_optimizedLayout").innerHTML = "உகந்த அமைப்பு";
            document.getElementById("txt_single_swipe").innerHTML = "ஒரே தேய்";
            document.getElementById("txt_quick_change").innerHTML = "மொழி மாற்றம்";
            document.getElementById("txt_languages").innerHTML = "மொழிகள்";
            document.getElementById("txt_customizability").innerHTML = "தேர்வுகள்";
            document.getElementById("txt_qwerty_keyboard").innerHTML = "ஆங்கில விசைப்பலகை";
            break;
        default: // "ENGLISH"
            document.getElementById("title").innerHTML = "Apurva Keyboard";
            document.getElementById("navbar_title").innerHTML = "Apurva Keyboard";
            document.getElementById("navbar_Demo").innerHTML = "Demo";
            document.getElementById("navbar_feedback").innerHTML = "Feedback";
            document.getElementById("navbar_FAQ").innerHTML = "F.A.Q.";
            document.getElementById("link_language_drop").innerHTML = "Laungage";
            document.getElementById("txt_keyboardRedesigned").innerHTML = "The Keyboard redesigned";
            document.getElementById("txt_optimizedLayout").innerHTML = "Optimized layout";
            document.getElementById("txt_single_swipe").innerHTML = "A single swipe";
            document.getElementById("txt_quick_change").innerHTML = "quick switch design";
            document.getElementById("txt_languages").innerHTML = "Languages targeted";
            document.getElementById("txt_customizability").innerHTML = "Customizable";
            document.getElementById("txt_qwerty_keyboard").innerHTML = "Dedicated qwerty Keyboard";

    }
}

//reWritePage(lang);
