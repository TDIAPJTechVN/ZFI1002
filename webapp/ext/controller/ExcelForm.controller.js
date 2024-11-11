sap.ui.define(
	[
		'sap/ui/core/mvc/ControllerExtension',
		"sap/ui/model/json/JSONModel",
		"sap/ui/model/type/Date"
	]
	, function (ControllerExtension, JSONModel, DateType) {
	'use strict';

	return ControllerExtension.extend('ns1.zfi1002v3.ext.controller.ExcelForm', {
		// this section allows to extend lifecycle hooks or hooks provided by Fiori elements
		override: {
			/**
             * Called when a controller is instantiated and its View controls (if available) are already created.
             * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
             * @memberOf ns1.zfi1002v3.ext.controller.ExcelForm
             */
			onInit: function () {
				// you can access the Fiori elements extensionAPI via this.base.getExtensionAPI
				var oModel = this.base.getExtensionAPI().getModel();
				
				var today = new Date();
				var mDate = {
					startDate: this.formatDate(today),
					endDate: this.formatDate(today)
				}
				var model = new sap.ui.model.json.JSONModel();
				model.setData(mDate);
				this.getView().setModel(model, "modelDate");
			}
		},
		onDateChange: function(oEvent) {
			var oDatePicker = oEvent.getSource(); 
			var newDate = this.formatDate(oDatePicker.getValue());  
		
			if (oDatePicker.getId() === this.getView().byId("startDatePicker").getId()) {
				var oModel = this.getView().getModel("modelDate");
				oModel.setProperty("/startDate", newDate);  
				console.log("Cập nhật startDate: ", newDate);
			}
		
			if (oDatePicker.getId() === this.getView().byId("endDatePicker").getId()) {
				var oModel = this.getView().getModel("modelDate");
				oModel.setProperty("/endDate", newDate);  
				console.log("Cập nhật endDate: ", newDate);
			}
        },
		ExcelForm: function() {
			if (!this.oDialog) {
                sap.ui.require([
					"sap/ui/core/Fragment"
				  ], function(Fragment){
					Fragment.load({
					  id: this.getView().getId(),
					  name: "ns1.zfi1002v3.ext.fragments.Dialog",
					  controller: this
					}).then(function(oValueHelpDialog) {
					  this.oDialog = oValueHelpDialog;
					  this.getView().addDependent(this.oDialog);
					  this.oDialog.open();
					}.bind(this));
				  }.bind(this));
            } else {
                this.oDialog.open(); // Nếu đã tồn tại, mở lại
            }
		},

        onOkPress: function () {
			var sDatePicker = this.getView().byId("startDatePicker"); 
            var sStartDate = sDatePicker.getValue();   
            console.log("start:", sStartDate);

			var eDatePicker = this.getView().byId("endDatePicker"); 
            var sEndDate = eDatePicker.getValue();   
            console.log("end:", sEndDate);

			var oEventBus = sap.ui.getCore().getEventBus();
            var oData = {
                fromDate: sStartDate, 
				toDate: sEndDate
            };
            // Gửi dữ liệu qua EventBus
            oEventBus.publish("ControllerGetData", "getData", oData);
            console.log("Data sent to ControllerB:", oData);

			this.oDialog.close();
        },

        closeDialog: function() {
			if (this.oDialog) {
				console.log("close", this.oDialog);
				this.oDialog.close();
			}
		},

		formatDate(date) {
			var dateIn = new Date(date);
			var yyyy = dateIn.getFullYear();
			var mm = dateIn.getMonth() + 1; 
			var dd = dateIn.getDate();
			return String(dd).padStart(2,'0') +"-"+ String(mm).padStart(2,'0') +"-"+ yyyy
		},
	});
});
