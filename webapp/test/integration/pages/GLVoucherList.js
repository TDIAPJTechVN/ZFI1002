sap.ui.define(['sap/fe/test/ListReport'], function(ListReport) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ListReport(
        {
            appId: 'ns1.zfi1002v3',
            componentId: 'GLVoucherList',
            contextPath: '/GLVoucher'
        },
        CustomPageDefinitions
    );
});