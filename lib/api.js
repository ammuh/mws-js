var mws = require('./mws');
var sprintf = require("sprintf-js").sprintf;
//Init request objects

function AmazonAPI(cred) {
	this.credentials = cred;
	this.client = new mws.Client(cred.accessKeyId, cred.secretKey, cred.sId, {});
}

AmazonAPI.prototype.scheduleReport = function (callback){
	var reqId;
	var rr = new mws.reports.requests.RequestReport();
	rr.set('ReportType', '_GET_FLAT_FILE_OPEN_LISTINGS_DATA_')
		.set('MarketplaceIds', this.credentials.mIds.com);
	this.client.invoke(rr, function(result){
		var coreObj = result["RequestReportResponse"]["RequestReportResult"][0]["ReportRequestInfo"][0];
		console.log(coreObj);
		if(coreObj.ReportProcessingStatus[0] == "_SUBMITTED_"){
			reqId = coreObj.ReportRequestId[0];
			console.log("Request Submitted with ReqId: " + reqId);
			console.log("Invoking Request List Client...");
			callback(reqId, coreObj);
		}else{
			console.log("Error");
		}
	});
};

AmazonAPI.prototype.checkScheduledReport = function(reqId, callback){
	var grr = new mws.reports.requests.GetReportRequestList();
	this.client.invoke(grr, function(result){
		var coreArr = result["GetReportRequestListResponse"]["GetReportRequestListResult"][0]["ReportRequestInfo"];
		for (var i = 0; i < coreArr.length; i++) {
			if(reqId == coreArr[i]["ReportRequestId"][0]){
				if(coreArr[i]["ReportProcessingStatus"][0] == "_DONE_"){
					callback(1);
				}else{
					callback(0);
				}
			}
		}
		console.log("Request Id not found, reschedule cache reload.");
		callback(-1);
	});
};

AmazonAPI.prototype.getReport = function(reqId, callback){
	var grl = new mws.reports.requests.GetReportList();
	var gr = new mws.reports.requests.GetReport();
	var obj = this;
	this.client.invoke(grl, function(result){
		var coreArr = result["GetReportListResponse"]["GetReportListResult"][0]["ReportInfo"];
		for(var i  = 0; i < coreArr.length; i++){
			if(coreArr[i]["ReportRequestId"][0] == reqId)
			{
				gr.set('ReportId', coreArr[i]["ReportId"][0]);
				obj.client.invoke(gr, function(rresult){
					callback(rresult);
				});
				break;
			}
		}
		
	});
};

AmazonAPI.prototype.changeStockBySKU = function(mId, sku, stock, callback){
	var gfsl = new mws.feeds.requests.GetFeedSubmissionList();
	var gfsr = new mws.feeds.requests.GetFeedSubmissionResult();
	var xml = `<?xml version="1.0" encoding="utf-8" ?> 
	<AmazonEnvelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="amzn-envelope.xsd">
	<Header>
	  <DocumentVersion>1.01</DocumentVersion> 
	  <MerchantIdentifier>%s</MerchantIdentifier> 
	  </Header>
	  <MessageType>Inventory</MessageType> 
	<Message>
	  <MessageID>1</MessageID> 
	  <OperationType>Update</OperationType> 
	<Inventory>
	  <SKU>%s</SKU> 
	  <Quantity>%d</Quantity> 
	  <FulfillmentLatency>1</FulfillmentLatency> 
	  </Inventory>
	  </Message>
	</AmazonEnvelope>`;
	var body = sprintf(xml, mId, sku, stock);
	var sf = new mws.feeds.requests.SubmitFeed();
	sf.set('FeedType', '_POST_INVENTORY_AVAILABILITY_DATA_')
		.set('FeedContents', body);
	this.client.invoke(sf, function(result){
		callback(result);
	});
};

AmazonAPI.prototype.changePriceBySKU = function(mId, sku, price, callback){
	var gfsl = new mws.feeds.requests.GetFeedSubmissionList();
	var gfsr = new mws.feeds.requests.GetFeedSubmissionResult();
	var xml = `<?xml version="1.0"encoding="utf-8" ?>
	<AmazonEnvelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="amzn-envelope.xsd">
		<Header>
		   	<DocumentVersion>1.01</DocumentVersion>
			<MerchantIdentifier>%s</MerchantIdentifier>
	   	</Header>
	   <MessageType>Price</MessageType>
		<Message>
		   <MessageID>1</MessageID>
			<Price>
				<SKU>%s</SKU>
				<StandardPrice currency="USD">%g</StandardPrice>
			</Price>
		</Message>
	 
	</AmazonEnvelope>`;
	var body = sprintf(xml, mId, sku, price);
	var sf = new mws.feeds.requests.SubmitFeed();
	sf.set('FeedType', '_POST_PRODUCT_PRICING_DATA_')
		.set('FeedContents', body);
	this.client.invoke(sf, function(result){
		callback(result);
	});
};

exports.API = AmazonAPI;