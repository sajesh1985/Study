import React, { MutableRefObject } from 'react';
import { faThumbsUp, faThumbsDown, faClone } from '@fortawesome/free-solid-svg-icons';
import { Purpose } from '@spglobal/koi-helpers';
//import moment from 'moment-timezone';

import { Feedback, Interaction, Sentiment } from '../../../types/interaction';
import { useChatRD } from '../../../context/chatrd';
import { interactionFeedback } from '../../../services/api';
import { FeedbackModal } from '../../../components/FeedbackModal/FeedbackModal';
import { CurrentUserAvatar } from './CurrentUserAvatar';
import {
  FeedbackContainer,
  Item,
  Avatar,
  Body,
  FeedbackIcon,
  QuestionBody,
  ChatResponseContent,
  ChatResponseContentDefault,
  Dot,
} from './ChatMessage.styles';
import { H5, Tooltip, TooltipPlacement } from '@spglobal/react-components';
import { GridExport, KnowledgeDiscoveryDocuments, KnowledgeDiscoveryResponseNode, TableResponseNode, TextResponseNode } from '@root/types/api';
import { ResponseView } from '../../../components/_common/ResponseView/ResponseView';
import { DocumentList } from '../../../components/_common/KnowledgeDiscoveryView/KnowledgeDiscoveryView.styles';
import { RESEARCH_MAPPING } from '../../../constants/constants';
import moment from 'moment';
import { toDateCultureResponse } from '../../../utils/dateLocalization';
import { useUserTraits } from '@spglobal/userprofileservice';
//import { ContextView } from '../../../components/_common/ContextView/ContextView';

interface ChatMessageProps {
  interaction: Interaction;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ interaction }) => {
  const { updateInteraction,session,copyToClipBoard,chatHistory } = useChatRD();
  
  //const userProfile = useUserTraits(['timeZoneAbbreviation', 'culture', 'mSTimeZoneID']);
  const userInformation = useUserTraits(['keyOnlineUser','timeZoneAbbreviation', 'culture', 'mSTimeZoneID']);
  
  const { id,date,interactionId, req,responseBody, res, loading, feedback, feedbackEnabled,responseTimestamp } = interaction;
  const respBody = loading ? <Dot /> : res;
  const responseRef = React.useRef<HTMLDivElement>(null);
  const sendFeedback = async (feedback: Feedback) => {
    updateInteraction(id, { feedback });
    try {
      await interactionFeedback(session,id, {
        sentiment: feedback.sentiment,
        text: feedback.text,
        tags: feedback.tags,
      });
    } catch (e) {
      updateInteraction(id, {
        feedback: undefined,
      });
    }
  };
  const [isOpen, setIsOpen] = React.useState(false);
  

  const [copyText, setCopyText] = React.useState<string>('Copy Response');

  let temp:KnowledgeDiscoveryDocuments[]=[];
  const copyDivToClipboard = (ref: MutableRefObject<HTMLDivElement>) => {
    window.getSelection()?.removeAllRanges(); 
    const fragment = document.createDocumentFragment();
    if (ref.current) {
      ref.current.childNodes.forEach((node:any) =>{
          if(node.tagName == "DIV") 
          {
            if(node.className !== "")
              {
                fragment.appendChild(node.cloneNode(true));
              }
              else
              {
                let gridAPI:GridExport = copyToClipBoard(interactionId);
                let headers:any[] =[];
                if(gridAPI)
                  {
                    const table=document.createElement('table');
                    table.border = '1';
                    const thead= document.createElement('thead');
                    const headerRow = document.createElement('tr');
                    headers = Object.keys(gridAPI.rowData[0]);
                    headers.forEach(headerText =>{
                      const th=document.createElement('th');
                      th.textContent = headerText;
                      headerRow.appendChild(th);
                    });
                    thead.appendChild(headerRow);
                    table.appendChild(thead);
          
                    const tbody = document.createElement('tbody');
                    gridAPI.rowData.forEach(rowData =>{
                      const tr=document.createElement('tr');
                      headers.forEach(header =>{
                        const td=document.createElement('td');
                        td.textContent = rowData[header];
                        tr.appendChild(td);
                      });
                      tbody.appendChild(tr); 
                    });
                    table.appendChild(tbody);
                    fragment.appendChild(table);
                  }
              }
            
          }
          else
          {
            fragment.appendChild(node.cloneNode(true));
          }
        
      });

      const tempDiv = document.createElement('div');
      tempDiv.appendChild(fragment);
      document.body.appendChild(tempDiv);
      const range = document.createRange();
      range.selectNodeContents(tempDiv);

      window.getSelection()?.removeAllRanges(); // clear current selection
      window.getSelection()?.addRange(range);
        
    
      document.execCommand('copy');
          window.getSelection().removeAllRanges(); // to deselect
          document.body.removeChild(tempDiv);
          setCopyText('Copied!');
          setTimeout(() => setCopyText('Copy Response'), 1000);
      
    }
  };
  return (
    <>
     {interaction.req &&(
      <Item>
        <CurrentUserAvatar />
        <QuestionBody>{req}</QuestionBody>
        <div className='date'><span>{date}</span></div>
      </Item>
       )}
       {((!interaction.req && sessionStorage.getItem('EventStream') == '1') || sessionStorage.getItem('EventStream') == '0' || chatHistory == 'History')&& (
      <Item>
        <div>
          <Avatar src={require('../../../assets/images/chatRDAI.svg')} />
        </div>
        <Body>
          {feedbackEnabled && (
            <FeedbackContainer>
              <Tooltip
                open={true}
                placement={TooltipPlacement.LEFT}
                triggerElement={
                  <FeedbackIcon className="initial" icon={faClone} purpose={Purpose.NONE} />
                }
                onTriggerClick={() => copyDivToClipboard(responseRef)}
                width={'auto'}
                contentPadding={5}
              >
                {copyText}
              </Tooltip>

              {!feedback?.sentiment && (
                <>
                  <FeedbackIcon
                    className="initial"
                    icon={faThumbsUp}
                    onClick={() =>
                      sendFeedback({ sentiment: Sentiment.Positive, text: '', tags: [] })
                    }
                  />
                  <FeedbackIcon
                    className="initial"
                    icon={faThumbsDown}
                    onClick={() => setIsOpen(true)}
                  />
                </>
              )}
              {feedback?.sentiment == Sentiment.Positive && (
                <FeedbackIcon
                  className="setUp"
                  icon={faThumbsUp}
                  purpose={Purpose.NONE}
                  color={'var(--color-text-link)'}
                />
              )}
              {feedback?.sentiment == Sentiment.Negative && (
                <FeedbackIcon
                  className="setUp"
                  icon={faThumbsDown}
                  purpose={Purpose.NONE}
                  color={'var(--color-text-link)'}
                />
              )}
            </FeedbackContainer>
          )}
          <FeedbackModal isOpen={isOpen} onClose={() => setIsOpen(false)} interactionId={interactionId} />
          { sessionStorage.getItem('EventStream') == '1' && chatHistory !== 'History' &&  (
            (interactionId && interactionId !== '') ? (<ChatResponseContentDefault ref={responseRef}>
            {responseBody && <ResponseView data={responseBody} interactionId={interactionId}/>
              }
            </ChatResponseContentDefault>):(<ChatResponseContent ref={responseRef}>
            {responseBody && <ResponseView data={responseBody} interactionId={interactionId}/>
            }
            {
              <div className="responseDate" style={{display:'flex',marginLeft:'auto',marginRight:'-51px'}}>
              <span>{toDateCultureResponse(
              responseTimestamp,
              userInformation.mSTimeZoneID
                )}</span>
              </div>
            }
            {
              responseBody.map((value: TextResponseNode | TableResponseNode | KnowledgeDiscoveryResponseNode)=>{
                if(value?.documents!=null && value?.documents.length > 0)
                  for(var k=0;k<value?.documents.length;k++)
                  {
                    temp.push(value.documents[k]);
                  }
                  
              })
            }

            {temp.length > 0 &&  <H5>Sources:</H5>}
           
            { 
              temp.length && temp.map((doc:KnowledgeDiscoveryDocuments)=>(
                <DocumentList>
                <a href={doc.url} target="_blank">{doc.title}</a>
                <span>{doc.date !=null ? " " + RESEARCH_MAPPING[doc.type as keyof typeof RESEARCH_MAPPING] + " published " + moment(doc.date).format('MMMM Do, YYYY') :''}</span>
              </DocumentList>
              )
              
            )
             
            }
            </ChatResponseContent>)
          )
          }
          {(sessionStorage.getItem('EventStream') == '0' || chatHistory == 'History') && 
              ( (feedbackEnabled == true) ? (<ChatResponseContentDefault ref={responseRef}>{respBody}</ChatResponseContentDefault> )
	            :(<ChatResponseContent ref={responseRef}>{respBody}</ChatResponseContent>))
          }
        </Body>
      </Item>
       )}
    </>
  );
};
