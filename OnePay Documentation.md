OnePay Documentation

Overview
Our API provides a simple and secure way to process payments and manage subscriptions. This guide covers the basics of integrating with our platform.

Authentication
All API requests require authentication using an API key. You can obtain your API key from the developer dashboard.

API Keys
Include your API key in the Authorization header of all requests:

Authorization:  YOUR_APP_TOKEN

                    
Error Handling
Our API uses conventional HTTP response codes to indicate the success or failure of an API request.

Error Codes
Code	Description
200	The checkout link has been successfully created
401	The Authorization header is either missing, contains an invalid application token, or includes an incorrect hash
400	The request body is invalid due to one or more of the following errors.
Detailed error information will be included in the response:
Invalid app id
Invalid amount
Monthly subscription quote exceed
Invalid app state
Currency type not available for app
429	Too many requests have been made within a one second period



OnepayJS Script File Usage
OnePayJS is a lightweight JavaScript that facilitates seamless integration with the OnePay payment gateway, allowing businesses to accept payments effortlessly on their websites. Designed for simplicity and efficiency, OnePayJS eliminates the need for page redirections by enabling an on-site payment gateway overlay.

Import onepayJs from this url link
<script src="https://storage.googleapis.com/onepayjs/onepayjs.js"></script>
Add it into your project index file
Log into our onepay Dashboard and find the app id, Hash token and app token. You can see how its done here
Add the following code based on your projects code base



import React, { useEffect } from "react";

function App() {
    const onePayData = {
        appid: "80NR1189D04CD635D8ACD",
        hashToken: "GR2P1189D04CD635D8AFD",
        amount: 100.0,
        orderReference: "7Q1M1187AE",
        customerFirstName: "Johe",
        customerLastName: "Dohe",
        customerPhoneNumber: "+94771234567",
        customerEmail: "test@gmail.com",
        transactionRedirectUrl: "https://www.google.com.au",
        additionalData: "returndata",
        apptoken: "ca00d67bf74d77b01fa26dc6780d7ff9522d8f82d30ff813d4c605f2662cea9ad332054cc66aff68.EYAW1189D04CD635D8B20",
        currency: "LKR"

    };

    useEffect(() => {
        // 1. Expose onePayData globally
        window.onePayData = onePayData;

        // 2. Add event listeners
        const handleOnePaySuccess = (e) => {
            const successData = e.detail;
            console.log("Payment SUCCESS from React:", successData);
        };

        const handleOnePayFail = (e) => {
            const failData = e.detail;
            console.log("Payment FAIL from React:", failData);
        };

        window.addEventListener("onePaySuccess", handleOnePaySuccess);
        window.addEventListener("onePayFail", handleOnePayFail);

        return () => {
            window.removeEventListener("onePaySuccess", handleOnePaySuccess);
            window.removeEventListener("onePayFail", handleOnePayFail);
        };
    }, [onePayData]);

    return (
        <div style={{ margin: "20px" }}>
            <div id="onepay-btn" />
            <div id="iframe-container" />
        </div>
    );
}

export default App;



API Implementation
This guide walks you through the process of implementing our payment system using the REST APIs. We'll cover the steps from creating items to processing payments.

Implementation Steps
Create Items (Optional)
If you want to associate specific items with your payment request:

Use the Create Item API to create items in the system
Store the returned
item_id
for use in payment requests
You can verify the item creation using the Get Item API
Items can be updated later using the Update Item API if needed
Generate Hash Key
Before creating a payment request, you need to generate a hash key:

Concatenate the following values in order:
app_id + currency + amount + <<YOUR HASH SALT>>
Apply SHA-256 algorithm to the concatenated string
Use the resulting hash string in your payment request
Example hash generation:

Input string: "80NR1189D04CD635D8ACDLKR100.00XXXHASHSALTXXX"
Hash result: "126ff89348d80fb91ec4f25c2bd55e2f71d8f3986da9470eabe28b2f8becf21a"
Create Payment Request
To initiate a payment transaction:

Use the Create Transaction API
Include the
item_ids
in the request if you want to associate specific items
The API will return a payment URL that you can use to redirect customers to the payment gateway
Track Payment Status
To monitor the payment status:

Use the Get Transaction API to check the payment status
Poll this endpoint periodically to track the payment completion
Callback Response
Set up your system to receive transaction status updates:

Update your callback URL in the APP section of the Onepay portal
Your endpoint should be configured to accept POST requests with JSON payloads
After transaction completion, Onepay will send a callback with transaction details
Sample callback payload:

Sample callback payload:

{
    "transaction_id": "WQBV118E584C83CBA50C6",
    "status": 1,
    "status_message": "SUCCESS",
    "additional_data": ""
}
Use this callback data for logging, verification, and updating transaction status in your system.

 Note: Make sure to handle all possible response codes and implement proper error handling as described in the Error Handling section.



Recurring Subscriptions
Onepay provides two methods to implement recurring subscriptions: using the OnepayJS library or direct API implementation. This guide covers both approaches to help you choose the best method for your needs.

Implementation Methods
Using OnepayJS
The simplest way to implement recurring subscriptions is using our JavaScript sdk:

Include the OnepayJS sdk in your project
Configure the subscription parameters
Call the onePaySubscription() function upon submit
Handle subscription events/result
        document.getElementById('subscriptionForm').addEventListener('submit', function(e) {
e.preventDefault();

// Update subscriptionData with form values
window.onePayData = {
    ...window.onePayData,
    appid: "YOUR_APP_ID",
    amount: 100.00,
    currency: "LKR",
    interval: "MONTH",
    interval_count: 2,
    days_until_due: 5,
    trial_period_days: 0,
    customer_details: {
        first_name: "Johe",
        last_name: "Doe",
        email: "johe.d@gmail.com",
        phone_number: "0778129152"
    }
    apptoken: "YOUR_APP_TOKEN"
};
// Trigger the subscription process
onePaySubscription();
});

// Handle subscription success
window.addEventListener('onePaySuccess', function(event) {
    console.log('Payment successful:', event.detail);
    alert('Payment successful! Transaction ID: ' + event.detail.transaction_id);
});

// Listen for failure event
window.addEventListener('onePayFail', function(event) {
    console.log('Payment failed:', event.detail);
    alert('Payment failed! Transaction ID: ' + event.detail.transaction_id);
});






