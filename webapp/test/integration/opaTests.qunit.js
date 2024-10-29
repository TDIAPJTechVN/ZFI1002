sap.ui.require(
    [
        'sap/fe/test/JourneyRunner',
        'ns1/zfi1002v3/test/integration/FirstJourney',
		'ns1/zfi1002v3/test/integration/pages/GLVoucherList',
		'ns1/zfi1002v3/test/integration/pages/GLVoucherObjectPage',
		'ns1/zfi1002v3/test/integration/pages/GLVoucherItemsObjectPage'
    ],
    function(JourneyRunner, opaJourney, GLVoucherList, GLVoucherObjectPage, GLVoucherItemsObjectPage) {
        'use strict';
        var JourneyRunner = new JourneyRunner({
            // start index.html in web folder
            launchUrl: sap.ui.require.toUrl('ns1/zfi1002v3') + '/index.html'
        });

       
        JourneyRunner.run(
            {
                pages: { 
					onTheGLVoucherList: GLVoucherList,
					onTheGLVoucherObjectPage: GLVoucherObjectPage,
					onTheGLVoucherItemsObjectPage: GLVoucherItemsObjectPage
                }
            },
            opaJourney.run
        );
    }
);