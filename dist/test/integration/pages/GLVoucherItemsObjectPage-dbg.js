sap.ui.define(['sap/fe/test/ObjectPage'], function(ObjectPage) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ObjectPage(
        {
            appId: 'ns1.zfi1002v3',
            componentId: 'GLVoucherItemsObjectPage',
            contextPath: '/GLVoucher/_items'
        },
        CustomPageDefinitions
    );
});