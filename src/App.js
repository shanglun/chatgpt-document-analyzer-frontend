import React, {useState, useEffect} from 'react';
import axios from 'axios';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Accordion from 'react-bootstrap/Accordion';
import Form from 'react-bootstrap/Form';
import ListGroup from 'react-bootstrap/ListGroup';
import 'bootstrap/dist/css/bootstrap.min.css';

const ResultDisplay = ({
  initialAnalysis, userQuestion, setUserQuestion,
  userQuestionResult, userQuestionMessage,
  userQuestionAsked, askUserQuestion
}) => {
  const analysis = JSON.parse(initialAnalysis.analysis)
  return <Row>
  <Col>
    <Row style={{marginTop: '10px'}}>
      <Col md={{ span: 10, offset: 1 }}>
        <Accordion defaultActiveKey="0">
          <Accordion.Item eventKey="0">
            <Accordion.Header>Analysis Result</Accordion.Header>
            <Accordion.Body>
              <h6>Purpose</h6>
              <p>{analysis.purpose}</p>
              <h6>Primary Conclusion</h6>
              <p>{analysis.primaryConclusion}</p>
              <h6>Secondary Conclusion</h6>
              <p>{analysis.secondaryConclusion}</p>
              <h6>Intended Audience</h6>
              <p>{analysis.intendedAudience}</p>
              <h6>Additional Context</h6>
              <p>{analysis.additionalContextString}</p>
            </Accordion.Body>
          </Accordion.Item>
          <Accordion.Item eventKey="1">
            <Accordion.Header>Raw Translated Text</Accordion.Header>
            <Accordion.Body>
              <pre>{initialAnalysis.translatedText}</pre>
            </Accordion.Body>
          </Accordion.Item>
          <Accordion.Item eventKey="2">
            <Accordion.Header>Raw Source Text</Accordion.Header>
            <Accordion.Body>
              <pre>{initialAnalysis.rawText}</pre>
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>        
      </Col>
    </Row>
    <Row style={{marginTop: '10px'}}>
      <Col md={{ span: 8, offset: 1 }}>
        <Form.Control type="text"
           placeholder="Additional Questions" 
           value={userQuestion} 
           onChange={e => setUserQuestion(e.target.value)} 
        />
      </Col>
      <Col md={{ span: 2 }}>
        <Button variant="primary" onClick={askUserQuestion}>Ask</Button>
      </Col>
        
    </Row>
    <Row><Col md={{span: 10, offset: 1}}>{userQuestionMessage}</Col></Row>
    <Row style={{marginTop: '10px'}}>
      <Col md={{span: 10, offset: 1}}>
      {userQuestionResult && userQuestionAsked ? <ListGroup>
        <ListGroup.Item>
          <h6>Q:</h6> 
          <p>{userQuestionAsked}</p>
          <h6>A:</h6> 
          <p> {userQuestionResult}</p>
        </ListGroup.Item>
      </ListGroup>: ''}
      </Col>
    </Row>
  </Col>
</Row>
}

function App() {
  const [file, setFile] = useState(null);
  const [haveFileAnalysisResults, setHaveFileAnalysisResults] = useState(false);
  const [message, setMessage] = useState('');
  const [userQuestionMessage, setUserQuestionMessage] = useState('');
  const [initialAnalysis, setInitialAnalysis] = useState({
    analysis: '[Analysis Result]', 
    translatedText: '[Translated Text]', 
    rawText: '[Raw Text]'
  });
  const [userQuestion, setUserQuestion] = useState('');
  const [userQuestionResult, setUserQuestionResult] = useState('');
  const [userQuestionAsked, setUserQuestionAsked] = useState('');

  const flashMessageBuilder = (setMessage) => (message) => {
    setMessage(message);
    setTimeout(() => {
      setMessage('');
    }, (5000));
  }

  const flashMessage = flashMessageBuilder(setMessage);
  const flashUserQuestionMessage = flashMessageBuilder(setUserQuestionMessage);

  const pollForResults = (batchId) => {
    flashMessage('Checking for results...');
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        axios.post('http://localhost:5000/check_if_finished', {batchId})
          .then(r => r.data)
          .then(d => {
            // the result should have a "status" key and a "result" key. 
            if (d.status === 'complete') {
              resolve(d); // we're done!
            } else {
              resolve(pollForResults(batchId)); // wait 5 seconds and try again.
            }
          }).catch(e => reject(e));
      }, 5000);
    })
  }
  
  const analyzeFile = () => {
    if (file === null) {
      flashMessage('No file selected!');
      return;
    }
    flashMessage('Uploading file...');
    const formData = new FormData();
    formData.append("file", file);
    axios.post("http://localhost:5000/analyze_file", formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
    }).then(r => r.data)
    .then(d => {
      // the result should contain a batchId that we use to poll for results.
      flashMessage('File upload success, waiting for analysis results...');
      return pollForResults(d.batchId);
    })
    .then(({analysis, translatedText, rawText}) => {
      // the result should contain the initial analysis results with the proper format.
      setInitialAnalysis({analysis, translatedText, rawText});
      setHaveFileAnalysisResults(true); // show the results display now that we have results
    })
    .catch(e => {
      console.log(e);
      flashMessage('There was an error with the upload. Please check the console for details.');
    })
  }

  const askUserQuestion = () => {
    flashUserQuestionMessage('Asking user question...')
    axios.post('http://localhost:5000/ask_user_question', {
      text: initialAnalysis.translatedText,
      userQuestion
    }).then(r => r.data)
    .then(d => {
      setUserQuestionResult(d.result);
      setUserQuestionAsked(userQuestion);
    }).catch(e => {
      console.log(e);
      flashUserQuestionMessage('There was an issue asking the question. Please check the console for details');
    });
  }
  return (
    <Container>
      <Row>
        <Col md={{ span: 8, offset: 1 }}>
            <Form.Group controlId="formFile">
              <Form.Label>Select a File to Analyze</Form.Label>
              <Form.Control type="file" onChange={e => setFile(e.target.files[0])} />
            </Form.Group>
        </Col>
        <Col md={{span: 2}}>
            <div style={{marginTop: '30px'}}><Button variant="primary" onClick={analyzeFile}>Analyze</Button></div>
        </Col>
        <Col md={{span: 10, offset:1 }}>{message}</Col>
      </Row>
      
      {haveFileAnalysisResults? <ResultDisplay 
        initialAnalysis={initialAnalysis}
        userQuestion={userQuestion}
        setUserQuestion={setUserQuestion}
        userQuestionResult={userQuestionResult}
        userQuestionMessage={userQuestionMessage}
        userQuestionAsked={userQuestionAsked}
        askUserQuestion={askUserQuestion}
      />: ''}
    </Container>
  );
}

export default App;
