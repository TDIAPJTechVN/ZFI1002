sap.ui.define(
	[
		'sap/ui/core/mvc/ControllerExtension',
		'sap/ui/model/json/JSONModel',
		'sap/ui/layout/VerticalLayout',
		'sap/m/Button',
		'sap/ui/thirdparty/jquery'
	], function (ControllerExtension, JSONModel, VerticalLayout, Button, jQuery) {
	'use strict';

	var arrHeader = [];
	var arrLine = [];
	let oSharedData = [];
	let strXml = "";
	var limit = 10;

	return ControllerExtension.extend('ns1.zfi1002v3.ext.controller.PrintPDF', {
		// this section allows to extend lifecycle hooks or hooks provided by Fiori elements
		override: {
			/**
             * Called when a controller is instantiated and its View controls (if available) are already created.
             * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
             * @memberOf ns1.zfi1002v3.ext.controller.PrintPDF
             */
			onInit: function () {
				// you can access the Fiori elements extensionAPI via this.base.getExtensionAPI
				var oModel = this.base.getExtensionAPI().getModel();
				// this.getOAuthToken();
				// this.onOpenPdf(base64PDF);
			},
		},
		PrintPDF: async function() {
			let aContexts = "";
			arrHeader = [];
			arrLine = [];
			let arrAccD = [];
			
            var oModel = this.getView().getModel();
            aContexts = this.base.getExtensionAPI().getSelectedContexts();
            var oBindList = oModel.bindList("/GLVoucherItems");

			let promises = aContexts.map(element => {
				return element.requestObject().then(async (ContextData) => {
					console.log("ContextData", ContextData);
					// Lấy thông tin của data header và data line
					arrAccD.push(ContextData.AccountingDocument); 
					arrHeader.push(ContextData); // push header
				});
			});
			
			Promise.all(promises)
			.then(async () => {
				// dùng mảng AccountingDocument lấy ra những arrLine tương ứng
				const data = await this.filterLineByHeader(arrAccD, oBindList);  
				arrLine = data;

				// console.log("arrLine", arrLine);
				var gird = await this.arrHeaderLine(arrHeader, arrLine);
			})
			.catch(error => {
				console.error("Error retrieving context data:", error);
			});
		},
		jsonToXml: async function(array) {
			this._sValidPath = sap.ui.require.toUrl("ns1/zfi1002v3/template/payment.xml");
			strXml = "";
			var arrTable = [];
			var objTable = {};
			console.log("gird", array);
			var arrHe = array.HeaderItems;
			var arrLi = array.LineItems;
			for (let i= 0; i< arrLi.length ;i++){
				var array = arrLi[i];
			  objTable = {
				'RECEIPTDATE': array.DocumentItemText,
				'REF': array.DocumentItemText,
				'AMOUNT': array.GLAccount,
			  }
			  arrTable.push(objTable)
			}

			var obj = 
				{
					'CompanyName':'TDI',
					'Registration':"0634567895",
					'Address':'Binh Thanh',
					'Phone':'084345769',
					'TaxCode':'234567890',
					'Mail':'tdi@apj.com',
					'Website':'tdi',
					'ReceivedFrom':"0856",
					'Tel':'09876534567',
					'Fax':'098234567',
					'ReceiptNo':arrHe.AccountingDocument,
					'BankAccount':'',
					'Currency':arrHe.AccountingDocument,
					'PRODUCT': arrTable.map(product =>
						strXml = `
							<Product>
								<ReceiptDate>${product.RECEIPTDATE}</ReceiptDate>
								<Reference>${product.REF}</Reference>
								<Amount>${product.AMOUNT}</Amount>
							</Product>
						`),
					'AmountInWords':'',
					'SUM': this.formatMoney(arrTable.map(o => o.DEBIT).reduce((a, c) => { return a + c }), arrHe.TransactionCurrency),
				}
				console.log("obj", obj);
			await jQuery.get(this._sValidPath, function(xml_string) {
				var parser = new DOMParser();
				var xmlDoc = parser.parseFromString(xml_string, 'application/xml');  
				var $xml = $(xmlDoc);  
				var entries = Object.entries(obj);
				entries.forEach((para) => {
					var find = '##' + para[0] + '##';
					var regExp = new RegExp(find, 'g');
					
					$xml.find(para[0]).each(function() {
						var currentText = $(this).text();
						var updatedText = currentText.replace(regExp, para[1]);
						$(this).text(updatedText);  
					});

					if (para[0] === 'PRODUCT') {
						$xml.find('Products').each(function() {
							var currentText = $(this).html();
							var updatedText = currentText.replace(regExp, para[1]);
							// console.log("updatedText", updatedText);
							$(this).html(updatedText);
						});
					}
				});
			
				strXml = (new XMLSerializer()).serializeToString($xml[0]);

			}, 'text')
			.fail(function(jqXHR, textStatus, errorThrown) {
				console.error("Error:", textStatus, errorThrown);
			});

			console.log("strXml", strXml);
			return strXml;
		},
		filterLineByHeader: function(arrAccD, oBindList) {
			let filter = [];
			let alistItems = [];
		
			arrAccD.forEach(element => {
				filter.push(new sap.ui.model.Filter("AccountingDocument", sap.ui.model.FilterOperator.EQ, element));
			});
		
			let aFilter = new sap.ui.model.Filter(filter);
			return oBindList.filter(aFilter).requestContexts().then(aContexts => {
				aContexts.forEach(oContext => {
					alistItems.push(oContext.getObject());
				});
				return alistItems; 
			});
		},
		arrHeaderLine:async function(arrHeader, arrLine){
			var xmlStr  = "";
			var base64String = "";
			// console.log("arrHeader", arrHeader);
			// console.log("arrLine", arrLine);
			// Mapping header & line hoàn thành
			oSharedData = await this.nestArrays(arrHeader, arrLine); 
			console.log("Data mapping header line", oSharedData);

			// Ngắn trang theo line
			let oPagebreakLine = await this.pagebreak(oSharedData); 
			console.log("Data break", oPagebreakLine);

			let htmlElement = "";
			for (let k = 0; k < oPagebreakLine.length; k++) {
				// console.log("oPagebreakLine[k]", oPagebreakLine[k]);
				htmlElement += await this.jsonToXml(oPagebreakLine[k]);
				
			}
			
			// In ra pdf
			 xmlStr = '<Root>' + htmlElement + '</Root>';
			console.log("xmlStr", xmlStr);
			base64String = btoa(unescape(encodeURIComponent(xmlStr)));
			console.log("encodedString",base64String);
			setTimeout(() => this.getOAuthToken(base64String, true), 3000);
		},
		nestArrays: async function(headerItem, lineItems) {
			const lineItemsMap = {};
			lineItems.forEach(item => {
				const docId = item.AccountingDocument;
				if (!lineItemsMap[docId]) {
					lineItemsMap[docId] = [];
				}
				lineItemsMap[docId].push(item);
			});

			// Lồng line items vào accounting documents và loại bỏ những line items có mảng rỗng
			const combinedResult = headerItem.map(HeaderItems => {
				const lineItems = lineItemsMap[HeaderItems.AccountingDocument] || [];
				return {
					HeaderItems,
					LineItems: lineItems
				};
			}).filter(item => item.LineItems.length > 0);  // Chỉ giữ lại những phần tử có LineItems không rỗng

			return combinedResult;
		},
		pagebreak(oSharedData){
			const breakData = oSharedData.flatMap(item => {
				if (item.LineItems.length > limit) {
					const result = [];
					const lineItems = item.LineItems;
					
					for (let i = 0; i < lineItems.length; i += limit) {
						const newLineItems = lineItems.slice(i, i + limit);
						result.push({ ...item, LineItems: newLineItems });
					}
					
					return result; 
				}
				return [item]; 
			});
			
			// console.log("breakData", breakData);
			return breakData;
		},
		onOpenPdf: function (fileContent) {
			let pdfWindow = null;
			const byteCharacters = atob(fileContent);
			const byteArrays = [];
			for (let offset = 0; offset < byteCharacters.length; offset += 1024) {
				const slice = byteCharacters.slice(offset, offset + 1024);
				const byteNumbers = new Array(slice.length);
				for (let i = 0; i < slice.length; i++) {
					byteNumbers[i] = slice.charCodeAt(i);
				}
				byteArrays.push(new Uint8Array(byteNumbers));
			}
			const pdfBlob = new Blob(byteArrays, { type: 'application/pdf' });
			const pdfUrl = URL.createObjectURL(pdfBlob);
			if (pdfWindow && !pdfWindow.closed) {
				// Nếu tab PDF đã mở, chỉ cần cập nhật lại nội dung của tab
				pdfWindow.location.href = pdfUrl;
			} else {
				// Nếu chưa mở, tạo mới một tab
				pdfWindow = window.open(pdfUrl);
			}
		},
		getOAuthToken: async function(base64String){
			// console.log("base64String base64String", base64String);
			var tokenUrl = 'https://training-integration-xzunlbtw.authentication.us10.hana.ondemand.com/oauth/token'; 
			var clientId = 'sb-70736f9d-018b-427c-bc90-37be93976825!b308585|ads-xsappname!b65488';
			var clientSecret = 'ecb31903-21a7-4935-a29a-cb5d9f7352c5$dLSusXV9ZfFT5gK8fKLqpS8lp3lbfpALnShWBIniqxQ=';
			var grantType = 'client_credentials'; 

			var postData = {
				grant_type: grantType,
				client_id: clientId,
				client_secret: clientSecret
			};
			
			jQuery.ajax({
				url: tokenUrl,
				type: 'POST',
				contentType: 'application/x-www-form-urlencoded',
				data: postData,
				success: function(response) {
					// Lưu access token để sử dụng cho các request tiếp theo
					var accessToken = response.access_token;
					// console.log('Token received: ', accessToken);
					this.callApiWithToken(accessToken, base64String);
				}.bind(this),
				error: function(xhr, status, error) {
					console.error('Error getting OAuth token:', error);
				}
			});
		},
		callApiWithToken:async function(accessToken, base64String){
			// console.log("accessToken", accessToken);
			var apiUrl = 'https://adsrestapi-formsprocessing.cfapps.us10.hana.ondemand.com/v1/adsRender/pdf?templateSource=storageName&TraceLevel=2'; 
			var bodyData = {
				"xdpTemplate": "Sales_Receipt/salesreceipt",
				xmlData: base64String,
				// "xmlData": "PFJvb3Q+PERldGFpbD4KCQkJPENvbXBhbnk+CgkJCQk8Q29tcGFueU5hbWU+VERJPC9Db21wYW55TmFtZT4gIAoJCQkJPFJlZ2lzdHJhdGlvbj48L1JlZ2lzdHJhdGlvbj4JCgkJCQk8QWRkcmVzcz4jI0FkZHJlc3MjIzwvQWRkcmVzcz4KCQkJCTxQaG9uZT4jI1Bob25lIyM8L1Bob25lPiAgCQkJCgkJCQk8VGF4Q29kZT4jI1RheENvZGUjIzwvVGF4Q29kZT4gICAKCQkJCTxFLW1haWw+IyNtYWlsIyM8L0UtbWFpbD4gIAoJCQkJPFdlYnNpdGU+IyN3ZWJzaXRlIyM8L1dlYnNpdGU+IAoJCQk8L0NvbXBhbnk+CgkJCTxJbnZvaWNlPgoJCQkJPFJlY2VpdmVkRnJvbT4jI1JlY2VpdmVkRnJvbSMjPC9SZWNlaXZlZEZyb20+ICAgCgkJCQk8VGVsPjAzNDIwNzQyNDYyNDwvVGVsPiAgCgkJCQk8RmF4PiA8L0ZheD4gIAoJCQkJPFJlY2VpcHRObz4xMDAwMDAzNzY8L1JlY2VpcHRObz4gIAoJCQkJPEJhbmtBY2NvdW50PjE4MDAxMTwvQmFua0FjY291bnQ+ICAKCQkJCTxDdXJyZW5jeT4xMDAwMDAzNzY8L0N1cnJlbmN5PiAgCgkJCQk8UHJvZHVjdHM+CgkJCQkJCQk8UHJvZHVjdD4KCQkJCQkJCQk8UmVjZWlwdERhdGUvPgoJCQkJCQkJCTxSZWZlcmVuY2U+RlggVW5yZWFsaXplZCBSZW1lYXN1cmVtZW50IEdhaW4uPC9SZWZlcmVuY2U+CgkJCQkJCQkJPEFtb3VudD4yMTIwMDAwMDwvQW1vdW50PgoJCQkJCQkJPC9Qcm9kdWN0PgoJCQkJCQksCgkJCQkJCQk8UHJvZHVjdD4KCQkJCQkJCQk8UmVjZWlwdERhdGUvPgoJCQkJCQkJCTxSZWZlcmVuY2UvPgoJCQkJCQkJCTxBbW91bnQ+NzI1NDk5OTk8L0Ftb3VudD4KCQkJCQkJCTwvUHJvZHVjdD4KCQkJCQkJIDwvUHJvZHVjdHM+CgkJCQk8QW1vdW50SW5Xb3Jkcz5N4buZdCB0cmnhu4d1IGJhIHRyxINtIG5naMOsbiDEkeG7k25nIGNo4bq1bjwvQW1vdW50SW5Xb3Jkcz4KCQkJCTxUb3RhbD4xMjAzNzA0PC9Ub3RhbD4gICAgICAKCQkJCTxOb3RlPlRoaXMgaXMgY29tcGFueTwvTm90ZT4gCgkJCTwvSW52b2ljZT4KCQk8L0RldGFpbD48L1Jvb3Q+",
				"formType": "print",
				"formLocale": "en_US",
				"taggedPdf": 1,
				"embedFont": 0,
				"changeNotAllowed": false,
				"printNotAllowed": false
			}
			var proxyUrl = 'https://cors-anywhere.herokuapp.com/';
			// jQuery.ajax({
			// 	url: proxyUrl  + apiUrl,
			// 	// url: apiUrl,
			// 	type: 'POST',
			// 	contentType: 'application/json',
			// 	headers: {
			// 		'Authorization': 'Bearer ' + accessToken ,
			// 		'Access-Control-Allow-Origin': '*',
			// 		'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
			// 		'Access-Control-Allow-Headers': 'Content-Type, Authorization, Origin, X-Requested-With, Content-Type, Accept',
			// 		'Access-Control-Allow-Credentials': true
			// 	},
			// 	data: JSON.stringify(bodyData),
			// 	success: function(response) {
			// 		console.log('API response: ', response);
			// 		this.onOpenPdf(response.fileContent);
			// 	}.bind(this),
			// 	error: function(xhr, status, error) {
			// 		console.error('Error calling API:', error);
			// 	}
			// });

			const { destinationService } = require('@sap-cloud-sdk/core');
			const fetch = require('node-fetch'); 
			
			const destination = await destinationService.getDestination('your-destination-name');

			// Lấy URL và authentication từ destination
			const apiUrl = destination.url;
			const authHeader = destination.authentication === 'OAuth2' 
								? await getOAuth2Token(destination) // Lấy OAuth2 token nếu cần
								: null;

			// Gọi API
			const response = await fetch(apiUrl, {
			method: 'GET',  // Phương thức gọi API
			headers: {
				'Authorization': accessToken ? `Bearer ${accessToken}` : '', // Token OAuth2 nếu cần
				'Content-Type': 'application/json',
			}
			});

			const data = await response.json();
			console.log('API Response:', data);
		},
		formatDate(date) {
			var dateIn = new Date(date);
			var yyyy = dateIn.getFullYear();
			var mm = dateIn.getMonth() + 1; 
			var dd = dateIn.getDate();
			return String(dd).padStart(2,'0') +"-"+ String(mm).padStart(2,'0') +"-"+ yyyy
		},

		formatMoney(number, currency) {
			return new Intl.NumberFormat('de-DE', { 
			  style: 'currency', 
			  currency: currency, 
			  currencyDisplay: "code" 
			})
			.format(number)
			.replace(currency, "")
			.trim();
		},
	});
});
