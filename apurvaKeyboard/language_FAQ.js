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
            document.getElementById("txt_title").innerHTML = "அடிக்கடி கேட்கப்படும் கேள்விகள்";
            document.getElementById("txt_sub_title").innerHTML = "என்னெனில், தகவல் வெளிப்படுத்தல் ";

            document.getElementById("q_whenLangAdded").innerHTML = "எப்போது (உங்கள் மொழி) சேர்க்க படும் ?";
            document.getElementById("q_whenSpellCheck").innerHTML = " ஆங்கில மொழி திருத்தல் சேர்க்கப்படுமா ? ";
            document.getElementById("q_willSteal").innerHTML = "இந்த விசைப்பலகை நான் எழுதும் வார்தைகளை திருடுமா ?";
            document.getElementById("q_whatPermissions").innerHTML = "என்னென்ன அனுமதிகள் தேவை ?";
            break;
        default: // "ENGLISH"
            document.getElementById("title").innerHTML = "Apurva Keyboard";
            document.getElementById("navbar_title").innerHTML = "Apurva Keyboard";
            document.getElementById("navbar_Demo").innerHTML = "Demo";
            document.getElementById("navbar_feedback").innerHTML = "Feedback";
            document.getElementById("navbar_FAQ").innerHTML = "F.A.Q.";
            document.getElementById("link_language_drop").innerHTML = "Laungage";
            document.getElementById("txt_title").innerHTML = "Frequently Asked Questions";
            document.getElementById("txt_sub_title").innerHTML = "Because... information transparency";

            document.getElementById("q_whenLangAdded").innerHTML = " When will (insert language) be added ? ";
            document.getElementById("q_whenSpellCheck").innerHTML = " Will a spell check feature for English be added ? ";
            document.getElementById("q_willSteal").innerHTML = " Should I worry about this keyboard stealing information written by me ? ";
            document.getElementById("q_whatPermissions").innerHTML = " What permissions does Apurva Keyboard use, and why ? ";

    }
}

//reWritePage(lang);
