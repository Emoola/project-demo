 
        var msalConfig = {
            auth: {
                clientId: '', //This is your application ID (obtained from Azure portal)
                authority: "https://login.microsoftonline.com/{tenantId}" //This is your tenant info (add your tenant id)
                //authority: "https://login.microsoftonline.com/{tenantId}/oauth2/token" 
            },
            cache: {
                cacheLocation: "localStorage",
                storeAuthStateInCookie: true
            }
        };

        //get constants from Power BI Service web portal (app.powerbi.com)
        const reportId = "";
        const groupId = "";
        var endpoint = "https://api.powerbi.com/v1.0/myorg/groups/" + groupId + "/reports/" + reportId + "/GenerateToken";

        var powerbiConfig = {
            powerbiEndpoint: endpoint
        };


        // create a request object for login or token request calls (refer to API permissions from app registration on azure portal)
        var requestObj = {
            scopes: ["https://analysis.windows.net/powerbi/api/Dashboard.Read.All"]  
        };

        var myMSALObj = new Msal.UserAgentApplication(msalConfig);

        // Register Callbacks for redirect flow
        // myMSALObj.handleRedirectCallbacks(acquireTokenRedirectCallBack, acquireTokenErrorRedirectCallBack);
        myMSALObj.handleRedirectCallback(authRedirectCallBack);
        
        

        function signIn() {
            myMSALObj.loginPopup(requestObj).then(function (loginResponse) {
                //Successful login
                showWelcomeMessage();
                //Call PowerBI using the token in the response
                acquireTokenPopupAndCallPowerBI();
            }).catch(function (error) {
                //Please check the console for errors
                console.log(error);
            });
        }

        function signOut() {
            myMSALObj.logout();
        }

        function acquireTokenPopupAndCallPowerBI() {
            //Always start with acquireTokenSilent to obtain a token in the signed in user from cache
            myMSALObj.acquireTokenSilent(requestObj).then(function (tokenResponse) {
                console.log("accessToken received.")
                callPowerBI(powerbiConfig.powerbiEndpoint, tokenResponse.accessToken, powerbiAPICallback);
            }).catch(function (error) {
                console.log(error);
                // Upon acquireTokenSilent failure (due to consent or interaction or login required ONLY)
                // Call acquireTokenPopup(popup window)
                if (requiresInteraction(error.errorCode)) {
                    myMSALObj.acquireTokenPopup(requestObj).then(function (tokenResponse) {
                        callPowerBI(powerbiConfig.powerbiEndpoint, tokenResponse.accessToken, powerbiAPICallback);
                    }).catch(function (error) {
                        console.log(error);
                    });
                }
            });
        }

        function callPowerBI(theUrl, accessToken, callback) {
            var xmlHttp = new XMLHttpRequest();
            xmlHttp.onreadystatechange = function () {
                if (this.readyState == 4 && this.status == 200) {
                    console.log("embedToken received.")
                    embedToken = callback(JSON.parse(this.responseText));
                    embedReport(embedToken);
                }
            }
            xmlHttp.open("POST", theUrl, true); // true for asynchronous
            xmlHttp.setRequestHeader('Authorization', 'Bearer ' + accessToken);
            xmlHttp.setRequestHeader('Content-Type', "application/json; charset = utf-8");
            xmlHttp.setRequestHeader('Accept', "application/json");
            var requestBody = JSON.stringify({ "accessLevel": "View", "allowSaveAs": false });
            xmlHttp.send(requestBody);
        }

        function powerbiAPICallback(data) {
            return data.token; //return access token from API call
        }

        function embedReport(embedToken) {
      
            var embedToken = embedToken;
            var url = "https://app.powerbi.com/reportEmbed?reportId=" + reportId + "&groupId=" + groupId;
               
            var embedUrl = url;
            var embedReportId = reportId;

               
            var models = window['powerbi-client'].models;  //use PowerBI Javascript 
            
            var embedConfig = {
                type: 'report',
                tokenType: models.TokenType.Embed,
                accessToken: embedToken,
                embedUrl: embedUrl,
                id: embedReportId,
                permissions: models.Permissions.All,
                settings: {
                filterPaneEnabled: false, //Hide filter of the filter pane on the right
                navContentPaneEnabled: true //Show tab on the bottom of the report
                }
            };
            // return embedded report to div
            var $reportContainer = $('#reportContainer');
        var report = powerbi.embed($reportContainer.get(0), embedConfig);
    }

    function showWelcomeMessage() {
        var divWelcome = document.getElementById('WelcomeMessage');
        divWelcome.innerHTML = "Welcome " + myMSALObj.getAccount().userName + " to Power BI Embedded Webpage!";
        var loginbutton = document.getElementById('SignIn');
        loginbutton.innerHTML = 'Sign Out';
        loginbutton.setAttribute('onclick', 'signOut();');
        $("#SignIn").show(); //document.getElementById('SignIn').show;
    }


   //This function can be removed if you do not need to support IE
   function acquireTokenRedirectAndCallPowerBI() {
        //Always start with acquireTokenSilent to obtain a token in the signed in user from cache
        myMSALObj.acquireTokenSilent(requestObj).then(function (tokenResponse) {
            callPowerBI(powerbiConfig.powerbiEndpoint, tokenResponse.accessToken, powerbiAPICallback);
        }).catch(function (error) {
            console.log(error);
            // Upon acquireTokenSilent failure (due to consent or interaction or login required ONLY)
            // Call acquireTokenRedirect
            if (requiresInteraction(error.errorCode)) {
                myMSALObj.acquireTokenRedirect(requestObj);
            }
        });
    }

    function authRedirectCallBack(error, response) {
        if (error) {
            console.log(error);
        } else {
            if (response.tokenType === "access_token") {
                callPowerBI(powerbiConfig.powerbiEndpoint, response.accessToken, powerbiAPICallback);
            } else {
                console.log("token type is:" + response.tokenType);
            }
        }
    }

    function requiresInteraction(errorCode) {
        if (!errorCode || !errorCode.length) {
            return false;
        }
        return errorCode === "consent_required" ||
            errorCode === "interaction_required" ||
            errorCode === "login_required";
    }

    // Browser check variables
    var ua = window.navigator.userAgent;
    var msie = ua.indexOf('MSIE ');
    var msie11 = ua.indexOf('Trident/');
    var msedge = ua.indexOf('Edge/');
    var isIE = msie > 0 || msie11 > 0;
    var isEdge = msedge > 0;

    //If you support IE, our recommendation is that you sign-in using Redirect APIs
    //If you as a developer are testing using Edge InPrivate mode, please add "isEdge" to the if check

    // can change this to default an experience outside browser use
    var loginType = isIE ? "REDIRECT" : "POPUP";

    // runs on page load, change config to try different login types to see what is best for your application
    if (loginType === 'POPUP') {
        if (myMSALObj.getAccount()) {// avoid duplicate code execution on page load in case of iframe and popup window.
            showWelcomeMessage();
            acquireTokenPopupAndCallPowerBI();
        }
    }
    else if (loginType === 'REDIRECT') {
        document.getElementById("SignIn").onclick = function () {
            myMSALObj.loginRedirect(requestObj);
        };

        if (myMSALObj.getAccount() && !myMSALObj.isCallback(window.location.hash)) {// avoid duplicate code execution on page load in case of iframe and popup window.
            showWelcomeMessage();
            acquireTokenRedirectAndCallPowerBI();
        }
    } else {
        console.error('Please set a valid login type');
    }

    
    $(document).ready(function() {
        $("#SignIn").hide();
        setTimeout(function() {
            signIn();

        }, 1000);
        clearTimeout(); 
        
    });