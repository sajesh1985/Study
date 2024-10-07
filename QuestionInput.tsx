import 'regenerator-runtime';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import React, { useState, useEffect, useMemo, KeyboardEvent, forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ClearableField,
  useIsBreakpoint,
  Icon,
  DropDownItem,
  DropDownGroup,
  Modal,
  ModalContent,
  ModalFooter,
  ModalHeader,
  InputField,
  Tabs,
  Tab,
} from '@spglobal/react-components';

import { BreakPoint, DISPLAYNAME_PREFIX, Purpose, Size } from '@spglobal/koi-helpers';
import { faArrowRight, faHistory } from '@fortawesome/free-solid-svg-icons';
import { Interaction } from '../../../types/interaction';
import { useChatRD } from '../../../context/chatrd';
import ChatRDGenerateIcon from '../DoubleStarsIcon/DoubleStarsIcon';
import { GenerateInfoBlock } from '../GenerateInfoBlock/GenerateInfoBlock';

import {
  InputContainer,
  Container,
  StyledSpeechIcon,
  HistoryDropdown,
  HistoryDropdownItem,
  GenerateButton,
  CustomModalStyled,
} from './QuestionInput.styles';

import {
  QuestionInputType,
  CurrentTabEnum,
  ResponseType,
  Direction,
  AtInputType,
} from './QuestionInput.types';

import { SpeechIcon } from '../SpeechIcon/SpeechIcon';

import { getGenerateInput } from '../../../services/api';
import { CustomModalList } from './CustomModalList';
import { TabNavigationKeys } from './TabNavigationKeys';

export const QuestionInput = forwardRef<HTMLInputElement, QuestionInputType>(
  ({ onSearch, domUpdateValue, onSearchValueUpdate,isButtonDisabled }, ref) => {
    const { t } = useTranslation(['chatiq_main']);
    const isMobile = useIsBreakpoint(BreakPoint.MD);
    const { interactions } = useChatRD();
    const { transcript, resetTranscript, browserSupportsSpeechRecognition } =
      useSpeechRecognition();
    const [searchValue, setSearchValue] = useState<string>('');
    const [isListening, setIsListening] = useState<boolean>(false);
    const [speechSupport, setSpeechSupport] = useState<boolean>(true);
    const [allowSpeech, setAllowSpeech] = useState<boolean>(true);

    useEffect(() => {
      setSearchValue(domUpdateValue);
    }, [domUpdateValue]);
    const handleSearch = () => {
      if (searchValue.toString().trim() !== '') {
        stopHandle();
        setTimeout(() => {
          onSearch(searchValue.trim());
          onSearchValueUpdate('');
          setSearchValue('');
        }, 200);
      }
    };

     const handleListing = () => {
       setIsListening(true);
       document.body.classList.add('focuseTemp');
       SpeechRecognition.startListening({
         continuous: true,
       });
      };

    const stopHandle = () => {
      SpeechRecognition.stopListening();
      document.body.classList.remove('focuseTemp');
      setIsListening(false);
      resetTranscript();
    };

    useEffect(() => {
      if (transcript) {
        setSearchValue(transcript);
        if (!isListening) {
          resetTranscript();
        }
      }

      if (!browserSupportsSpeechRecognition) {
        setSpeechSupport(false);
      }
    }, [transcript, browserSupportsSpeechRecognition]);

      const IQuestions = useMemo(() => {
        const filterQuestionData = interactions?.filter(
          (item: Interaction) => item.req
        );
        let arr1 = Array.from(
          new Set(filterQuestionData?.map((filterQuestion: Interaction) => filterQuestion?.input))
        );
        let arr2 = Array.from(new Set(interactions.map((item: Interaction) => item.req && item.req.toString())));
        if(arr1 && arr1.length > 0 && arr2 && arr2.length > 0)
        {
          return arr1.concat(arr2);
        }
        else
        {
          return (arr1 && arr1.length > 0) ? arr1 : arr2;
        }
        
      }, [interactions]);

    
    const SQuestionsIndex = useMemo(() => {
      let selectedIndex = null;
      IQuestions.forEach((item: string, index: number) => {
        if (item == searchValue) {
          selectedIndex = index;
        }
      });
      return selectedIndex;
    }, [IQuestions, searchValue]);

    const onKeyDownHandler = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        handleSearch();
      } else if (event.key === 'ArrowUp' && IQuestions.length > 0) {
        event.preventDefault();
        SQuestionsIndex == null
          ? setSearchValue(IQuestions[IQuestions.length - 1].toString())
          : SQuestionsIndex == 0
          ? setSearchValue(IQuestions[0].toString())
          : setSearchValue(IQuestions[SQuestionsIndex - 1].toString());
      } else if (event.key === 'ArrowDown' && IQuestions.length > 0) {
        event.preventDefault();
        SQuestionsIndex == null
          ? setSearchValue(IQuestions[0].toString())
          : SQuestionsIndex == IQuestions.length - 1
          ? setSearchValue(IQuestions[IQuestions.length - 1].toString())
          : setSearchValue(IQuestions[SQuestionsIndex + 1].toString());
      }
    };

    const handleSpeechIconClick = () => {
      navigator.mediaDevices
        .getUserMedia({ audio: true, video: false })
        .then(() => {
          isListening ? stopHandle() : handleListing();
        })
        .catch(() => {
          setAllowSpeech(false);
        });
    };

    const [isAtModalOpen, setIsAtModalOpen] = useState<boolean>(false);
    const [atInput, setAtInput] = useState<AtInputType>({
      value:'',
      currentTab: CurrentTabEnum.none
    });
    const [atStateResponse, setAtStateResponse] = useState<ResponseType | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [selectedTabId, setSelectedTabId] = useState(CurrentTabEnum.all);

    useEffect(() => {
      const searchedValue = atInput.value;

      setIsLoading(true);
      const loadData = async () => {
        const activeTab = atInput.currentTab;
        try {
          let response;
          if (activeTab !== CurrentTabEnum.none) {
            response = await getGenerateInput(searchedValue, activeTab);
            setAtStateResponse(response);
          }
          setIsLoading(false);
        } catch (error) {
          console.error('Fetch error', error);
          setIsLoading(false);
        }
      };

      const timerId = setTimeout(loadData, 2000);

      return () => {
        clearTimeout(timerId);
        if (isLoading) setIsLoading(false);
      };
    }, [atInput]);

    const handleCloseCustomModal = () => {
      setIsAtModalOpen(false);
      setAtStateResponse(null);
      setAtInput({ value: '', currentTab: CurrentTabEnum.none });
      setSelectedTabId(CurrentTabEnum.all);
    };

    const handleSearchValueOnChange = (value: string) => {
      const match = value.match(/@\s*(\S+)/);

      if (match && match[1]) {
        setIsAtModalOpen(true);
        setAtInput({ value: match[1], currentTab: CurrentTabEnum.all });
      }

      setSearchValue(value);
    };

    const handleUpdateGenerativeInput = (name: string) => {
      const partBeforeSpecialSymbol = name.split('�')[0];
      const formSearchValue = searchValue.split('@')[0] + ' ' + partBeforeSpecialSymbol;

      handleCloseCustomModal();
      setSearchValue(formSearchValue);
    };

    const handleAtInputOnChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const value: string = event.target.value;

      if (value.endsWith('>') || value.endsWith('<')) {
        return;
      }

      setAtInput({ ...atInput, value: event.target.value });
    };

    const switchTab = (direction: Direction) => {
      const tabs: CurrentTabEnum[] = [
        CurrentTabEnum.all,
        CurrentTabEnum.companies,
        CurrentTabEnum.fixed_income,
      ];
      const currentIndex = tabs.indexOf(atInput.currentTab);
      let newIndex: number;

      if (direction === Direction.next) {
        newIndex = (currentIndex + 1) % tabs.length;
      } else {
        newIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      }

      setAtInput({ ...atInput, currentTab: tabs[newIndex] });
      setSelectedTabId(tabs[newIndex]);
    };

    useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.shiftKey && event.key === '>') {
          switchTab(Direction.next);
        } else if (event.shiftKey && event.key === '<') {
          switchTab(Direction.prev);
        }
      };

      document.addEventListener('keydown', handleKeyDown as unknown as EventListener);

      return () => {
        document.removeEventListener('keydown', handleKeyDown as unknown as EventListener);
      };
    }, [atInput.currentTab]);

    return (
      <>
        <CustomModalStyled>
          <Modal
            ariaLabel="Modal"
            canEscapeKeyClose
            canOutsideClickClose
            style={{
              height: '760px',
              marginLeft: 'var(--size-space-10xl)',
              position: 'absolute',
              bottom: '60px',
            }}
            size={Size.LARGE}
            isOutlined
            slideFromTop
            hasBackdrop
            onClose={() => {
              handleCloseCustomModal();
            }}
            usePortal={false}
            isOpen={isAtModalOpen}
          >
            <ModalHeader title={''} style={{ height: '80px' }}>
              <InputField
                autoFocus
                componentSize={Size.MEDIUM}
                inFieldLabel=""
                maxLength={30}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  handleAtInputOnChange(event)
                }
                value={atInput.value}
                skeletonConfig={{
                  animation: true,
                  loading: false,
                }}
                type="text"
              />
            </ModalHeader>
            <ModalContent style={{ height: '630px', overflow: 'hidden' }}>
              <Tabs
                style={{ height: '630px', overflow: 'hidden' }}
                alignment="left"
                isPrimary={false}
                leftElement={null}
                moreButtonTitle=""
                resizeDelay={300}
                rightElement={null}
                selectedTabId={selectedTabId}
                showMore
                skeletonConfig={{
                  animation: true,
                  loading: false,
                }}
                tabsContainerTabIndex={-1}
              >
                <Tab
                  id={CurrentTabEnum.all}
                  title="All"
                  selected={selectedTabId === CurrentTabEnum.all ? true : false}
                  onClick={() => {
                    setAtInput({ ...atInput, currentTab: CurrentTabEnum.all });
                  }}
                  onClickCapture={() => {
                    setAtInput({ ...atInput, currentTab: CurrentTabEnum.all });
                  }}
                >
                  <CustomModalList
                    isLoading={isLoading}
                    listData={atStateResponse?.destinations}
                    handleItemClick={handleUpdateGenerativeInput}
                    highlightText={atInput.value}
                  />
                </Tab>

                <Tab
                  id={CurrentTabEnum.companies}
                  title="Companies"
                  selected={selectedTabId === CurrentTabEnum.companies ? true : false}
                  onClick={() => {
                    setAtInput({ ...atInput, currentTab: CurrentTabEnum.companies });
                  }}
                  onClickCapture={() => {
                    setAtInput({ ...atInput, currentTab: CurrentTabEnum.companies });
                  }}
                >
                  <CustomModalList
                    isLoading={isLoading}
                    listData={atStateResponse?.destinations}
                    handleItemClick={handleUpdateGenerativeInput}
                    highlightText={atInput.value}
                  />
                </Tab>

                <Tab
                  id={CurrentTabEnum.fixed_income}
                  title="Fixed Income"
                  selected={CurrentTabEnum.fixed_income ? true : false}
                  onClick={() => {
                    setAtInput({ ...atInput, currentTab: CurrentTabEnum.fixed_income });
                  }}
                  onClickCapture={() => {
                    setAtInput({ ...atInput, currentTab: CurrentTabEnum.fixed_income });
                  }}
                >
                  <CustomModalList
                    isLoading={isLoading}
                    listData={atStateResponse?.destinations}
                    handleItemClick={handleUpdateGenerativeInput}
                    highlightText={atInput.value}
                  />
                </Tab>
              </Tabs>
            </ModalContent>
            <ModalFooter style={{ textAlign: 'left' }}>
              <TabNavigationKeys />
            </ModalFooter>
          </Modal>
        </CustomModalStyled>
        <Container>
          <InputContainer>
            <ClearableField
              ref={ref}
              placeholder={true ? 'Ask a Question' : t('questionInput.placeholder')}
              value={searchValue}
              maxLength={250}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleSearchValueOnChange(e.target.value)
              }
              onClean={() => {
                stopHandle();
                setSearchValue('');
                onSearchValueUpdate('');
              }}
              type="text"
              onKeyDown={onKeyDownHandler}
            />
            {interactions.length > 0 && (
              <HistoryDropdown
                mobileMenuTitle={t('questionInput.questionsHistory')}
                disablePortal={true}
                transitionContainerClassName={'historyWrapper'}
                triggerElement={
                  <StyledSpeechIcon>
                    <Icon icon={faHistory} size={Size.MEDIUM} />
                  </StyledSpeechIcon>
                }
              >
                <DropDownGroup>
                  {IQuestions.map((question: string, index: number) => (
                    question && <DropDownItem key={index} selected={question == searchValue ? true : false}>
                      <HistoryDropdownItem
                        size={Size.LARGE}
                        onClick={() => setSearchValue(IQuestions[index].toString())}
                      >
                        {question}
                      </HistoryDropdownItem>
                    </DropDownItem>
                  ))}
                </DropDownGroup>
              </HistoryDropdown>
            )}
            {speechSupport && (
              <SpeechIcon
                allowSpeech={allowSpeech}
                isListening={isListening}
                handleSpeechIconClick={handleSpeechIconClick}
              />
          )}
          <GenerateButton
              leftIcon={isMobile ? null : <ChatRDGenerateIcon fill={isButtonDisabled ? 'var(--button-color-disabled)' : '#8AB4F8'}/>}
            purpose={Purpose.MARKETING}
              onClick={handleSearch}
              disabled={isButtonDisabled}
            >
              {isMobile ? <Icon icon={faArrowRight} /> : 'Generate'}
            </GenerateButton>
          </InputContainer>
          <GenerateInfoBlock />
        </Container>
      </>
    );
  }
);

QuestionInput.displayName = `${DISPLAYNAME_PREFIX}.QuestionInput`;
