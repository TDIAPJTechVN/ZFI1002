sap.ui.define(
	[
		'sap/ui/core/mvc/ControllerExtension',
		'sap/ui/thirdparty/jquery'
	]
	, function (ControllerExtension, jQuery) {
	'use strict';

	let strHtml = '';
	let oSharedData = [];
	var todayTime = new Date().getUTCFullYear()+""+(new Date().getUTCMonth()+1) +""+ new Date().getUTCDate() + "_" + new Date().getUTCHours() + "" + new Date().getUTCMinutes() + "" + new Date().getUTCSeconds();
	var today = new Date();
	var todayC = "Ngày " + String(today.getDate()).padStart(2, '0') + " tháng " + String(today.getMonth() +1).padStart(2, '0') + " năm " + today.getFullYear();

	var arrHeader = [];
	var arrLine = [];
	var limit = 10;

	return ControllerExtension.extend('ns1.zfi1002v3.ext.controller.PrintForm', {
		// this section allows to extend lifecycle hooks or hooks provided by Fiori elements
		override: {
			/**
             * Called when a controller is instantiated and its View controls (if available) are already created.
             * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
             * @memberOf ns1.zfi1002v3.ext.controller.PrintForm
             */
			onInit: function () {
				// you can access the Fiori elements extensionAPI via this.base.getExtensionAPI
				var oModel = this.base.getExtensionAPI().getModel();
				// console.log("jQuery",jQuery)

				var oEventBus = sap.ui.getCore().getEventBus();
				console.log("oEventBus nhận", oEventBus);
            	oEventBus.subscribe("ControllerGetData", "getData", this.getData, this);
			}
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
		getData: async function(sChannelId, sEventId, oData){
			console.log("oData", oData);
			let aDataHeader = [];
			var oModel = this.getView().getModel();
			var oBinding = oModel.bindList("/GLVoucher");
			var oBindList = oModel.bindList("/GLVoucherItems");
			var oFilter = new sap.ui.model.Filter("DocumentDate", sap.ui.model.FilterOperator.BT, this.convertDateFormat(oData.fromDate), this.convertDateFormat(oData.toDate));
			console.log("oFilteroFilter",oFilter);
			try {
				const aContexts = await oBinding.filter(oFilter).requestContexts();
				aContexts.forEach(oContext => {
					aDataHeader.push(oContext.getObject());
				});
				let accountingDocuments = aDataHeader.map(item => item.AccountingDocument);
				const data = await this.filterLineByHeader(accountingDocuments, oBindList);  
				arrLine = data;
				this.arrHeaderLine(aDataHeader, arrLine);

			} catch (error) {
				console.error("Có lỗi xảy ra khi lấy dữ liệu:", error);
			}
		},

		printForm: async function() {
			// oSharedData = [];
			let aContexts = "";
			arrHeader = [];
			arrLine = [];
			let arrAccD = [];
			
            var oModel = this.getView().getModel();
            aContexts = this.base.getExtensionAPI().getSelectedContexts();
            var oBindList = oModel.bindList("/GLVoucherItems");
			console.log("aContexts",aContexts);
			console.log("oBindList",oBindList);

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

				console.log("arrLine", arrLine);
				this.arrHeaderLine(arrHeader, arrLine);
			})
			.catch(error => {
				console.error("Error retrieving context data:", error);
			});
		},
		arrHeaderLine:async function(arrHeader, arrLine){
			// console.log("arrHeader", arrHeader);
			// console.log("arrLine", arrLine);
			// Mapping header & line hoàn thành
			oSharedData = await this.nestArrays(arrHeader, arrLine); 
			console.log("Data mapping header line", oSharedData);
			// Ngắn trang theo line
			let oPagebreakLine = await this.pagebreak(oSharedData); 
			console.log("Data break", oPagebreakLine);
			/*------------------------Xóa------------------*/
			// const result = [];
			// for (let i = 0; i < 10; i++) {
			// 	// Thêm một bản của phần tử đầu tiên vào mảng result
			// 	result.push(oSharedData[0]);
			// }
			// console.log("result", result);
			// oSharedData = result;
			/*------------------------Xóa------------------*/

			let htmlElement = "";
			for (let k = 0; k < oPagebreakLine.length; k++) {
				// Chờ mỗi templateHtml hoàn thành trước khi tiếp tục
				htmlElement += await this.templateHtml(oPagebreakLine[k], k + 1, oPagebreakLine.length);
			}

			// In ra HTML
			setTimeout(() => this.print(htmlElement, true), 3000);
		},	
		pagebreak(oSharedData){
			console.log("oSharedData",oSharedData);
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
			
			console.log("breakData", breakData);
			return breakData;
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

		print: function(html, flag){
			sap.ui.getCore().attachInit(function () {
				html2pdf() 
				.set({
				  filename: "demo_"+todayTime+".pdf",
				  margin: [5, 5, 5, 5],
				  jsPDF: {unit: 'mm', format: 'a4', orientation: 'portrait'},
				  pagebreak: { after: '.page-break'},
				})
				.from(html)
				.outputPdf()  
				.get('pdf')
				.then(function (pdfObj) {
				  if(flag){
					window.open(pdfObj.output("bloburl"), "F");
				  }
				});
			});
		},

		templateHtml:async function(array, len, arrLen){
			this._sValidPath = sap.ui.require.toUrl("ns1/zfi1002v3/template/accountingVoucher.html");
			// console.log("array", array);
			strHtml = "";
			var arrHe = array.HeaderItems;
			var arrLi = array.LineItems;
			var arrCompany = [];
			var arrTable = [];
			var objTable = {};

			// lọc data line
			for (let i= 0; i< arrLi.length ;i++){
				var array = arrLi[i];
			  objTable = {
				'STT': i+1,
				'DEC': array.DocumentItemText,
				'BANK': array.GLAccount,
				'DEBIT': parseFloat(array.DebitAmount),
				'CREDIT': parseFloat(array.CreditAmount),
				'CUR': array.CompanyCodeCurrency,
				'ACCOUNT': array.Supplier
			  }
			  arrTable.push(objTable)
			}
			
			var dateDoc = "Ngày " + String(new Date(arrHe.DocumentDate).getDate()).padStart(2, '0') + " tháng " + String(new Date(arrHe.DocumentDate).getMonth()+1).padStart(2, '0') + " năm " + new Date(arrHe.DocumentDate).getFullYear();
			var img = sap.ui.require.toUrl("ns1/zfi1002v3/images/logo.jpg");
			var obj = {
				'image':img,
				'TODAY':todayC,
				'CompanyName':"TDI APJ Vietnam Co., Ltd.",
				'Address':"Bình Thạnh",
				'Date':dateDoc,
				'CerType':arrHe.AccountingDocumentType,
				'CerNum':arrHe.AccountingDocument,
				'RefNum':arrHe.OriginalReferenceDocument,
				'NumVote':arrHe.AccountingDocument,
				'Status':arrHe.DocumentStatus,
				'Note':arrHe.ReversalReason,
				'PageNo':len + "/" + arrLen,
				'ExRate':arrHe.TransactionCurrency,
				'MoneyType':arrHe.TransactionCurrency,
				'PRTD': arrTable.map((row) => (
					strHtml =`
					<tr>
					${Object.values(row).map((value) => 
					(
						`<td style="border-bottom: 1px solid #ccc; padding:6px">${value}</td>`
					)).join('')}
					</tr>
				`)).join(''),
				'SUMDEBIT': this.formatMoney(arrTable.map(o => o.DEBIT).reduce((a, c) => { return a + c }), arrHe.TransactionCurrency),
				'SUMCREDIT':this.formatMoney(arrTable.map(o => o.CREDIT).reduce((a, c) => { return a + c }), arrHe.TransactionCurrency)
			}

			await jQuery.get(this._sValidPath, function(html_string) {
				strHtml = html_string;
				var entries = Object.entries(obj);
				
				entries.forEach((para) => {
					var find = '##' + para[0] + '##';
					var regExp = new RegExp(find, 'g');
					strHtml = strHtml.replace(regExp, para[1]);
				});
			}, 'html')
			.fail(function(jqXHR, texăntStatus, errorThrown) {
				console.error("Error:", textStatus, errorThrown);
			});

			// console.log("html", strHtml);
			return strHtml;
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

		formatDate(date) {
			var dateIn = new Date(date);
			var yyyy = dateIn.getFullYear();
			var mm = dateIn.getMonth() + 1; 
			var dd = dateIn.getDate();
			return String(dd).padStart(2,'0') +"-"+ String(mm).padStart(2,'0') +"-"+ yyyy
		},

		convertDateFormat(dateStr) {
			var parts = dateStr.split('-');
			var day = parts[0];
			var month = parts[1];
			var year = parts[2];
			
			// Trả về chuỗi theo định dạng yyyy-MM-dd
			return year + '-' + month + '-' + day;
		}
		
	});
});
