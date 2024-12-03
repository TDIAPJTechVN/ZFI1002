sap.ui.define(
	[
		'sap/ui/core/mvc/ControllerExtension',
		'sap/ui/thirdparty/jquery',
		'sap/m/MessageToast'
	], function (ControllerExtension, jQuery, MessageToast) {
	'use strict';

	var arrHeader = [];
	var arrLine = [];
	let oSharedData = [];
	let strXml = "";
	var limit = 10;
	let xmlRes = [];
	
	var username = "CPM_USER";  
	var password = "pscqTSJ5}vvYWqnbnTFfhyUFjegjonBdGDiiqpvM";

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

				// this.callApiWithToken("a");
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
					// console.log("ContextData", ContextData);
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
				// console.log("obj", obj);
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

			// console.log("strXml", strXml);
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
			// console.log("Data mapping header line", oSharedData);

			console.log("oSharedData", oSharedData);
			// Ngắn trang theo line
			// let oPagebreakLine = await this.pagebreak(oSharedData); 
			// console.log("Data break", oPagebreakLine);

			let htmlElement = "";
			let resAPI = ""
			xmlRes = [];
			for (let k = 0; k < oSharedData.length; k++) {
				htmlElement = await this.jsonToXml(oSharedData[k]);
				// In ra pdf
				xmlStr = '<Root>' + htmlElement + '</Root>';
				// console.log("xmlStr", xmlStr);
				resAPI = await this.callApiWithToken(xmlStr);

				// console.log("resAPI",resAPI);
				xmlRes.push(resAPI);
				console.log("xmlRes",xmlRes);
			}
			await this.onOpenPdf(xmlRes);
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
		onOpenPdf: function (base64Array) 
		{
			this.mergeBase64PDFsAndOpen(base64Array);
		},
		mergeBase64PDFsAndOpen: async function(base64Array) {
			const { PDFDocument } = PDFLib;

			// Tạo một tài liệu PDF mới
			const mergedPdf = await PDFDocument.create();

			for (let base64 of base64Array) {
				// Chuyển đổi base64 thành mảng byte
				const pdfBytes = new Uint8Array(atob(base64).split('').map(c => c.charCodeAt(0)));

				// Tải PDF từ byte
				const pdfDoc = await PDFDocument.load(pdfBytes);

				// copy PDF vào PDF mới
				const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPages().map((_, i) => i));

				// Thêm các trang vào PDF mới
				copiedPages.forEach((page) => {
					mergedPdf.addPage(page);
				});
			}

			const pdfBytesMerged = await mergedPdf.save();

			// mở tab
			const blob = new Blob([pdfBytesMerged], { type: 'application/pdf' });
			const url = URL.createObjectURL(blob);
			window.open(url, '_blank');
		  },
		callApiWithToken:async function(xml){
			// console.log("xml", xml);
			var bodyData = {
				"isprintqueue": "0",
				"formname": "Sales_Receipt",
				"templatename": "salesreceipt",  
				"filecontentxml": xml,
				"comm_scenario":"ZCS_FI1002A_GLVOUCHER",
				"comm_system_id":"BTP_VAS",
				"service_id":"ZFI10_02_GENERALLEDGERVOUCHER_OB_REST",
				"queuename":"DEV_PRINT_QUEUE",
				"documentname":"Test"
			}
			var credentials = btoa(username + ":" + password);
			var settings = {
				"url": "/sap/bc/http/sap/zbg_massprint",
				"method": "POST",
				"timeout": 0,
				"headers": {
				  "Content-Type": "application/json",
				  "Authorization": "Basic " + credentials,
				},
				"data": JSON.stringify(bodyData)
			  };
			  
			return new Promise(function(resolve, reject) {
				jQuery.ajax(settings)
					.done(function(response) {
						console.log("Dữ liệu từ ABAP", JSON.parse(response));
						let jsObject = JSON.parse(response)
						if(jsObject.MessageCode == 200){
							resolve(jsObject.base64Pdf);  // Trả kết quả khi gọi thành công
						}else{
							MessageToast.show("Error: " + jsObject.MessageText);
						}
					})
					.fail(function(jqXHR, textStatus, errorThrown) {
						console.error("AJAX request failed", textStatus, errorThrown);
						reject(errorThrown);  // Trả lỗi
					});
			});
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
