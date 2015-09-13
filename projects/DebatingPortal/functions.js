$(function()
{
	Parse.$ = jQuery;
	Parse.initialize("gaNH3iqPa51vU7S4UeJGU8BqPwEZWHxYiFvPYRIJ", "NlQk7ypYuRJLsf6EcOOvPJTUZLUbWSHhtYHOoUKD");
	hideAll();
	if(Parse.User.current())
	{
		document.getElementById("page_home").style.display="initial";
	}
	else
	{
		document.getElementById("page_login").style.display="initial";
	}

	hideAll();document.getElementById("page_debate").style.display="initial";

});

function showDebateParent(elem)
{
	var debateId = elem.id;
	console.log(debateId);
	var debateQuery = new Parse.Query("Debate");
	debateQuery.equalTo("objectId", debateId);
	debateQuery.find().then(function(results)
		{
			var debate = results[0].toJSON();
			showDebate(debate);
		}, function(error){Materialize.toast(error.message,4000);});
}

function showDebate(debate)
{
	console.log(debate);

	// var elem = document.getElementById('post_forConstructive');
	// elem.parentNode.removeChild(elem);
	// var elem = document.getElementById('post_againstConstructive');
	// elem.parentNode.removeChild(elem);
	$(post_forConstructive).empty();
	$(post_againstConstructive).empty();
	$(post_forRebuttal).empty();
	$(post_againstRebuttal).empty();

	// 1. hideAll() and then display post page
	hideAll();
	document.getElementById("page_debate").style.display="initial";

	// 2. get list of post IDs
	var postList = debate.postIdList;
	// 3. Set elements such as title and description
	document.getElementById("debate_title").innerHTML=debate.title;
	document.getElementById("debate_description").innerHTML=debate.description;

	for(i=0; i < postList.length; i++)
	{
		console.log(postList[i]);

		var query = new Parse.Query("Post");
		query.equalTo("objectId", postList[i]);
		query.find().then
		(
			function(results)
			{
				// console.log("successful read");
				// console.log(results[0]);
				if(results[0] == undefined)
					postInfo = (-1);
				else
				{
					postInfo = (results[0].toJSON());
					console.log(postInfo); // JSON object
					var cardString = cardGenerate(postInfo);

					// following decides where to add the post to
					console.log(postInfo.type + "," + postInfo.motion);
					if(postInfo.type == 'C')
					{
						if(postInfo.motion == 'F')
						{
							$(cardString).appendTo("#post_forConstructive");
						}
						else if(postInfo.motion == 'A')
						{
							$(cardString).appendTo("#post_againstConstructive");
						}
					}
					if(postInfo.type == 'R')
					{
						if(postInfo.motion == 'F')
						{
							$(cardString).appendTo("#post_forRebuttal");
						}
						else if(postInfo.motion == 'A')
						{
							$(cardString).appendTo("#post_againstRebuttal");
						}
					}
				}
			},
			function(error)
			{
				Materialize.toast(error.message,4000);
			}
		);

	} // end of loop
}

// generates card for debate based on posts in debate
function cardGenerate(postInfo)
{
	var cardString = "";
	cardString += "<li>";
	cardString += "<div class=\"row\">";
	cardString += "<div class=\"col s12\">";

	if(postInfo.type == 'C')
	{
		if(postInfo.motion == 'F')
		{
			cardString += "<div class=\"card cyan darken-3\">";
		}
		else if(postInfo.motion == 'A')
		{
			cardString += "<div class=\"card blue darken-3\">";
		}
	}
	if(postInfo.type == 'R')
	{
		if(postInfo.motion == 'F')
		{
			cardString += "<div class=\"card cyan darken-1\">";
		}
		else if(postInfo.motion == 'A')
		{
			cardString += "<div class=\"card blue darken-1\">";
		}
	}

	cardString += "<div class=\"card-content white-text\">";
	cardString += "<span class=\"card-title\">";
	cardString += postInfo.title;
	cardString += "</span>";
	cardString += "<p>";
	cardString += postInfo.description;
	cardString += "</p>";
	cardString += "</div>";
	cardString += "<div class=\"card-action\">";
	cardString += "<p>"; // open cross reference
	for(i = 0; i < postInfo.crossQuestionList.length; i++)
	{
		var QAList = postInfo.crossQuestionList[i];
		// let question = postInfo.crossQuestionList[i][0];
		// let answer   = postInfo.crossQuestionList[i][1];
		cardString += "Q) " + QAList[0] + "<br>";
		cardString += "A) " + QAList[1] + "<br>";
	}
	cardString += "</p>";
	cardString += "</div></div></div></div>"
	cardString += "</li>";
	console.log(cardString);
	return cardString;
}





function hideAll()
{
	document.getElementById("page_about").style.display="none";
	document.getElementById("page_login").style.display="none";
	document.getElementById("page_contactUs").style.display="none";
	document.getElementById("page_home").style.display="none";
	document.getElementById("page_debate").style.display="none";
	document.getElementById("page_policy").style.display="none";
	document.getElementById("page_settings").style.display="none";
	document.getElementById("page_notifications").style.display="none";
}


function pageChanged(elem)
{
	hideAll();
	if(elem.id == "link_about") {
		document.getElementById("page_about").style.display="initial";
	}
	else if(elem.id == "link_contactUs") {
		document.getElementById("page_contactUs").style.display="initial";
	}
	else if(elem.id == "link_login")
	{
		if(Parse.User.current())
			document.getElementById("page_home").style.display="initial";
		else
			document.getElementById("page_login").style.display="initial";
	}
	else if(elem.id == "link_policy") {
		document.getElementById("page_policy").style.display="initial";
	}
	else if(elem.id == "link_settings") {
		document.getElementById("page_settings").style.display="initial";
	}
	else if(elem.id == "link_notifications") {
		document.getElementById("page_notifications").style.display="initial";
	}
	else if(elem.id == "link_logOut") {
		Parse.User.logOut();
		Materialize.toast("you have been successfully logged out", 4000);
		document.getElementById("page_login").style.display="initial";
	}
}


function signUp()
{
	var user = new Parse.User();
	var emailId = document.getElementById("signUp_email").value;
	var password = document.getElementById("signUp_password").value;
	var repassword = document.getElementById("signUp_repassword").value;
	var firstName = document.getElementById("signUp_firstName").value;
	var lastName = document.getElementById("signUp_lastName").value;
	if(emailId == "")
	{
		Materialize.toast("Please enter email", 4000);
		return;
	}
	if(firstName == "")
	{
		Materialize.toast("Please enter first name", 4000);
		return;
	}
	if(lastName == "")
	{
		Materialize.toast("Please enter last name", 4000);
		return;
	}
	if(password == "")
	{
		Materialize.toast("Please enter password", 4000);
		return;
	}
	if(password != repassword)
	{
		Materialize.toast("Please enter same passwords", 4000);
		document.getElementById("signUp_password").value = "";
		document.getElementById("signUp_repassword").value = "";
		return;
	}
	var emptyList = [];
	user.set("email", emailId);
	user.set("password", password);
	user.set("username", emailId); // user name is the email
	user.set("firstName", firstName);
	user.set("lastName", lastName);
	user.set("debateList", emptyList);
	user.signUp(null,{
		success: function(user)
		{
		// account was created
		alert("Account successfully created. Please follow verification link mailed to you.");
		document.getElementById("signUp_email").value = "";
		document.getElementById("signUp_firstName").value = "";
		document.getElementById("signUp_lastName").value = "";
		document.getElementById("signUp_password").value = "";
		document.getElementById("signUp_repassword").value = "";
	},
	error: function(user, error)
	{
			// error creating account
			Materialize.toast(error.message,4000);
			document.getElementById("signUp_password").value = "";
			document.getElementById("signUp_repassword").value = "";
		}
	});
}

function signIn()
{
	var emailId = document.getElementById("signIn_email").value;
	var password = document.getElementById("signIn_password").value;
	Parse.User.logIn(emailId, password).then(function(user)
	{
		//User is logged in
		hideAll();
		document.getElementById("page_home").style.display="initial";
		updateDebateList();
	}, function(error)
	{
		Materialize.toast(error.message,4000);
	}

	);
}


function updateDebateList() {

var query = new Parse.Query("Debate");

//updating current debates
query.equalTo("active", true);
query.find({
	success: function(list) {


    // Successfully retrieved the object.
    for(var i = 0; i < list.length; i++)
	{
		var myObj = list[i].toJSON().objectId;
		console.log(myObj);

		var stringBuilder = "";
		stringBuilder += "<li>";
		stringBuilder += "<a id = ";
		stringBuilder += "\"";
		stringBuilder += myObj;
		stringBuilder += "\" ";
		stringBuilder += "style = \"";
		stringBuilder += "cursor:pointer;";
		stringBuilder += "\" ";
		stringBuilder += "onclick = \"";
		stringBuilder += "showDebateParent(this)";
		stringBuilder += "\"> ";
		stringBuilder += list[i].get("title");
		stringBuilder += "</a>";
		stringBuilder += "</li>";
		console.log(stringBuilder);
		$(stringBuilder).appendTo("#debateList_current");
    }

},
error: function(error)
{
	alert("Error: " + error.code + " " + error.message);
}

});



var query = new Parse.Query("Debate");
//updating completed debates
query.equalTo("active", false);
query.find({
	success: function(list) {
    // Successfully retrieved the object.
    for(var i = 0; i < list.length; i++)
	{
		var myObj = list[i].toJSON().objectId;
		console.log(myObj);

		var stringBuilder = "";
		stringBuilder += "<li>";
		stringBuilder += "<a id = ";
		stringBuilder += "\"";
		stringBuilder += myObj;
		stringBuilder += "\" ";
		stringBuilder += "style = \"";
		stringBuilder += "cursor:pointer;";
		stringBuilder += "\" ";
		stringBuilder += "onclick = \"";
		stringBuilder += "showDebateParent(this)";
		stringBuilder += "\"> ";
		stringBuilder += list[i].get("title");
		stringBuilder += "</a>";
		stringBuilder += "</li>";
		console.log(stringBuilder);
		$(stringBuilder).appendTo("#debateList_completed");
    }

},
error: function(error)
{
	alert("Error: " + error.code + " " + error.message);
}

});




var query = new Parse.Query("Debate");
//updating my debates
var myId = Parse.User.current().id;
query.containedIn("memberIdList", [myId]);
query.find(
{
	success: function(array) {


    // Successfully retrieved the object.
    for(var i = 0; i < array.length; i++)
	{
		var myObj = array[i].toJSON().objectId;
		console.log(myObj);

		var stringBuilder = "";
		stringBuilder += "<li>";
		stringBuilder += "<a id = ";
		stringBuilder += "\"";
		stringBuilder += myObj;
		stringBuilder += "\" ";
		stringBuilder += "style = \"";
		stringBuilder += "cursor:pointer;";
		stringBuilder += "\" ";
		stringBuilder += "onclick = \"";
		stringBuilder += "showDebateParent(this)";
		stringBuilder += "\"> ";
		stringBuilder += array[i].get("title");
		stringBuilder += "</a>";
		stringBuilder += "</li>";
		console.log(stringBuilder);
		$(stringBuilder).appendTo("#debateList_mine");
    }

},
error: function(error)
{
	alert("Error: " + error.code + " " + error.message);
}

});


}

function addPost()
{
	$('#inputModal').openModal();
}

function submitPost()
{
	$('#inputModal').closeModal();
	var motion = document.getElementById("submitPost_motion").value ;
	var type = document.getElementById("submitPost_type").value ;
	var title = document.getElementById("submitPost_title").value ;
	var description = document.getElementById("submitPost_description").value ;
	console.log(motion + "," + type + "," + title + "," + description);
}
